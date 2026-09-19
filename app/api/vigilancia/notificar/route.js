import { NextResponse } from 'next/server';
import { authenticateClinic, cleanEmails, getClients, getHondurasEpiWeek } from '../../../../utils/vigilancia/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const pin = String(body.pin || '').trim();
    const modo = body.modo === 'INMEDIATA' ? 'INMEDIATA' : 'SEMANAL';
    if (!/^[0-9a-f-]{36}$/i.test(token) || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'QR o código no válido.' }, { status: 400 });
    }
    const { admin } = getClients();
    const clinica = await authenticateClinic(admin, token, pin, request);
    if (!clinica) return NextResponse.json({ error: 'Código incorrecto o acceso temporalmente bloqueado.' }, { status: 401 });

    const periodo = getHondurasEpiWeek();
    let { data: boletin, error: boletinError } = await admin.from('vigilancia_boletines')
      .select('*').eq('clinica_id', clinica.clinica_id).eq('anio', periodo.year)
      .eq('semana_epidemiologica', periodo.week).maybeSingle();
    if (boletinError) throw boletinError;
    if (!boletin) {
      const created = await admin.from('vigilancia_boletines').insert({
        clinica_id: clinica.clinica_id, anio: periodo.year, semana_epidemiologica: periodo.week
      }).select('*').single();
      if (created.error) throw created.error;
      boletin = created.data;
    }
    if (boletin.estado === 'CERRADO') return NextResponse.json({ error: 'La semana está cerrada. Vigilancia debe autorizar cualquier corrección.' }, { status: 409 });

    if (modo === 'INMEDIATA') {
      const enfermedadCodigo = String(body.enfermedad_codigo || '').trim();
      const pacienteId = String(body.paciente_id || '').trim();
      if (!pacienteId) return NextResponse.json({ error: 'Ingrese el ID del paciente.' }, { status: 400 });
      const enfermedadResult = await admin.from('vigilancia_enfermedades')
        .select('*').eq('codigo', enfermedadCodigo).eq('activa', true).maybeSingle();
      const enfermedad = enfermedadResult.data;
      if (enfermedadResult.error || !enfermedad?.alerta_inmediata) {
        return NextResponse.json({ error: 'La enfermedad seleccionada no está habilitada para alerta inmediata.' }, { status: 400 });
      }
      const registration = await admin.rpc('vigilancia_registrar_evento_inmediato', {
        p_boletin_id: boletin.id, p_clinica_id: clinica.clinica_id,
        p_enfermedad_codigo: enfermedadCodigo, p_paciente_id: pacienteId
      });
      if (registration.error) throw registration.error;
      const registered = Array.isArray(registration.data) ? registration.data[0] : null;
      if (registered?.duplicado) return NextResponse.json({ ok: true, duplicate: true, message: 'Este caso ya había sido notificado; no se duplicó.' });
      const eventoId = registered?.evento_id;

      if (enfermedad.requiere_ficha) {
        await admin.from('vigilancia_fichas').upsert({
          evento_id: eventoId, boletin_id: boletin.id,
          enfermedad_codigo: enfermedadCodigo, paciente_id: pacienteId
        }, { onConflict: 'boletin_id,enfermedad_codigo,paciente_id', ignoreDuplicates: true });
      }
      const roleEmails = await admin.from('vigilancia_perfiles').select('email,rol,alcance_municipio')
        .eq('activo', true).in('rol', ['ADMIN_GENERAL','VIGILANCIA_REGIONAL','REGIONAL','ECOR','MUNICIPAL']);
      const recipients = cleanEmails([
        process.env.VIGILANCIA_ALERT_EMAILS, clinica.jefe_email, clinica.delegado_email,
        ...(roleEmails.data || []).filter(x => !x.alcance_municipio || x.alcance_municipio === clinica.municipio).map(x => x.email)
      ]);
      if (recipients.length) {
        await admin.from('vigilancia_cola_correos').insert({
          tipo: 'ALERTA_ROJA', destinatarios: recipients,
          asunto: `ALERTA ${enfermedad.nombre} | ${clinica.codigo} | SE ${periodo.week}`,
          cuerpo_html: `<h2>VIGILANCIA OLANCHO</h2><p><strong>Alerta inmediata:</strong> ${enfermedad.nombre}</p><p>Clínica: ${clinica.nombre} (${clinica.codigo})</p><p>Municipio: ${clinica.municipio}</p><p>ID de paciente: ${pacienteId}</p><p>Semana epidemiológica: ${periodo.week} / ${periodo.year}</p>`,
          referencia_tipo: 'EVENTO_INMEDIATO', referencia_id: eventoId
        });
      }
      return NextResponse.json({ ok: true, message: 'Caso inmediato registrado. Permanecerá acumulado en el boletín semanal.', requiere_ficha: enfermedad.requiere_ficha, ficha_url: enfermedad.ficha_url });
    }

    const counts = body.conteos && typeof body.conteos === 'object' ? body.conteos : {};
    const catalogResult = await admin.from('vigilancia_enfermedades').select('codigo').eq('activa', true);
    if (catalogResult.error) throw catalogResult.error;
    const existingResult = await admin.from('vigilancia_conteos').select('enfermedad_codigo,casos_inmediatos')
      .eq('boletin_id', boletin.id);
    if (existingResult.error) throw existingResult.error;
    const immediateMap = new Map((existingResult.data || []).map(x => [x.enfermedad_codigo, Number(x.casos_inmediatos || 0)]));
    const rows = [];
    for (const item of catalogResult.data || []) {
      const value = Number(counts[item.codigo] ?? 0);
      if (!Number.isInteger(value) || value < 0) return NextResponse.json({ error: 'Todas las casillas deben contener números enteros iguales o mayores que cero.' }, { status: 400 });
      const immediate = immediateMap.get(item.codigo) || 0;
      if (value < immediate) return NextResponse.json({ error: `El total de ${item.codigo} no puede ser menor que los ${immediate} casos inmediatos ya registrados.` }, { status: 400 });
      rows.push({ boletin_id: boletin.id, enfermedad_codigo: item.codigo, cantidad: value, casos_inmediatos: immediate, updated_at: new Date().toISOString() });
    }
    const upsert = await admin.from('vigilancia_conteos').upsert(rows, { onConflict: 'boletin_id,enfermedad_codigo' });
    if (upsert.error) throw upsert.error;
    const total = rows.reduce((sum, x) => sum + x.cantidad, 0);
    const updated = await admin.from('vigilancia_boletines').update({
      estado: 'ENVIADO', negativa: total === 0, enviado_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', boletin.id);
    if (updated.error) throw updated.error;
    await admin.from('vigilancia_listas_nominales').upsert({
      boletin_id: boletin.id, estado: total === 0 ? 'NO_APLICA' : 'PENDIENTE',
      correo_asunto: `${clinica.codigo} | Lista nominal | SE ${periodo.week} | ${periodo.year}`
    }, { onConflict: 'boletin_id' });
    return NextResponse.json({ ok: true, message: total === 0 ? 'Notificación negativa enviada correctamente.' : 'Boletín enviado. La lista nominal queda pendiente de remisión por correo.', total, periodo });
  } catch (error) {
    console.error('vigilancia-notificar', error);
    return NextResponse.json({ error: 'No fue posible guardar la notificación.' }, { status: 500 });
  }
}
