import { NextResponse } from 'next/server';
import { authenticateClinic, getClients, getHondurasEpiWeek } from '../../../../utils/vigilancia/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const pin = String(body.pin || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(token) || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'QR o código no válido.' }, { status: 400 });
    }
    const { admin } = getClients();
    const clinica = await authenticateClinic(admin, token, pin, request);
    if (!clinica) return NextResponse.json({ error: 'Código incorrecto o acceso temporalmente bloqueado.' }, { status: 401 });

    const periodo = getHondurasEpiWeek();
    const { data: enfermedades, error: catalogError } = await admin.from('vigilancia_enfermedades')
      .select('codigo,nombre,orden,alerta_inmediata,requiere_ficha,ficha_nombre,ficha_url')
      .eq('activa', true).order('orden');
    if (catalogError) throw catalogError;

    const { data: boletin } = await admin.from('vigilancia_boletines')
      .select('id,estado,enviado_at,cerrado_at').eq('clinica_id', clinica.clinica_id)
      .eq('anio', periodo.year).eq('semana_epidemiologica', periodo.week).maybeSingle();
    let conteos = [];
    if (boletin) {
      const result = await admin.from('vigilancia_conteos')
        .select('enfermedad_codigo,cantidad,casos_inmediatos').eq('boletin_id', boletin.id);
      if (result.error) throw result.error;
      conteos = result.data || [];
    }
    return NextResponse.json({ clinica, periodo, enfermedades, boletin, conteos });
  } catch (error) {
    console.error('vigilancia-acceso', error);
    return NextResponse.json({ error: 'No fue posible abrir el boletín.' }, { status: 500 });
  }
}
