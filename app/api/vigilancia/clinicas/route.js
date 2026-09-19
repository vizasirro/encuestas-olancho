import { NextResponse } from 'next/server';
import { generatePin, makePinHash, nullable, requireVigilanciaUser } from '../../../../utils/vigilancia/server';
import { MUNICIPIOS_OLANCHO } from '../../../../utils/vigilancia/catalog';

const MANAGERS = new Set(['ADMIN_GENERAL','GESTOR_USUARIOS']);
const TYPES = new Set(['CLINICA','HOSPITAL','CENTRO_MEDICO','LABORATORIO','OTRO']);

function publicClinic(row) {
  const { pin_hash: _pin, ...safe } = row;
  return safe;
}

function siteUrl(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

export async function GET(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await access.admin.from('vigilancia_clinicas').select('*').order('municipio').order('nombre');
  if (error) return NextResponse.json({ error: 'No fue posible cargar las clínicas.' }, { status: 500 });
  return NextResponse.json({ clinicas: (data || []).map(publicClinic) });
}

export async function POST(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const required = ['codigo','nombre','municipio','jefe_nombre','jefe_email','jefe_telefono','reunion_realizada_at'];
    if (required.some(k => !String(body[k] || '').trim())) {
      return NextResponse.json({ error: 'Complete código, nombre, municipio, jefe, correo, teléfono y fecha de reunión.' }, { status: 400 });
    }
    if (!MUNICIPIOS_OLANCHO.includes(body.municipio)) return NextResponse.json({ error: 'Seleccione un municipio válido de Olancho.' }, { status: 400 });
    if (!TYPES.has(body.tipo)) return NextResponse.json({ error: 'Tipo de establecimiento no válido.' }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(body.jefe_email)) return NextResponse.json({ error: 'El correo del responsable no es válido.' }, { status: 400 });
    const pin = /^\d{4}$/.test(String(body.pin || '')) ? String(body.pin) : generatePin();
    const payload = {
      codigo: String(body.codigo).trim().toUpperCase(), nombre: String(body.nombre).trim(), tipo: body.tipo,
      municipio: body.municipio, direccion: nullable(body.direccion), telefono: nullable(body.telefono),
      email_institucional: nullable(body.email_institucional)?.toLowerCase(),
      jefe_nombre: String(body.jefe_nombre).trim(), jefe_cargo: nullable(body.jefe_cargo),
      jefe_email: String(body.jefe_email).trim().toLowerCase(), jefe_telefono: String(body.jefe_telefono).trim(),
      delegado_nombre: nullable(body.delegado_nombre), delegado_cargo: nullable(body.delegado_cargo),
      delegado_email: nullable(body.delegado_email)?.toLowerCase(), delegado_telefono: nullable(body.delegado_telefono),
      licencia_sanitaria: nullable(body.licencia_sanitaria), licencia_vencimiento: nullable(body.licencia_vencimiento),
      fuente_registro: body.fuente_registro === 'LICENCIA_SANITARIA' ? 'LICENCIA_SANITARIA' : 'CENSO_PROVISIONAL',
      reunion_realizada_at: new Date(body.reunion_realizada_at).toISOString(),
      reunion_evidencia: nullable(body.reunion_evidencia), pin_hash: makePinHash(pin)
    };
    const { data, error } = await access.admin.from('vigilancia_clinicas').insert(payload).select('*').single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'El código o enlace QR ya existe.' }, { status: 409 });
      throw error;
    }
    const qrUrl = `${siteUrl(request)}/vigilancia/notificar/${data.qr_token}`;
    await access.admin.from('vigilancia_cola_correos').insert({
      tipo: 'CREDENCIALES', destinatarios: [data.jefe_email, data.delegado_email].filter(Boolean),
      asunto: `VIGILANCIA OLANCHO | Acceso ${data.codigo}`,
      cuerpo_html: `<h2>VIGILANCIA OLANCHO</h2><p>Establecimiento: ${data.nombre}</p><p>Enlace: ${qrUrl}</p><p>Código temporal de cuatro dígitos: <strong>${pin}</strong></p><p>Conserve este correo como respaldo institucional.</p>`,
      referencia_tipo: 'CLINICA', referencia_id: data.id
    });
    return NextResponse.json({ ok: true, clinica: publicClinic(data), pin, qr_url: qrUrl }, { status: 201 });
  } catch (error) {
    console.error('vigilancia-clinicas-post', error);
    return NextResponse.json({ error: 'No fue posible crear la clínica.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const id = String(body.id || '');
    const { data: clinic } = await access.admin.from('vigilancia_clinicas').select('*').eq('id', id).maybeSingle();
    if (!clinic) return NextResponse.json({ error: 'Clínica no encontrada.' }, { status: 404 });
    if (body.action === 'TOGGLE') {
      const { error } = await access.admin.from('vigilancia_clinicas').update({ activa: !clinic.activa, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true, activa: !clinic.activa });
    }
    if (body.action === 'RESET_PIN') {
      const pin = generatePin();
      const { error } = await access.admin.from('vigilancia_clinicas').update({ pin_hash: makePinHash(pin), updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      const recipients = [clinic.jefe_email, clinic.delegado_email, clinic.email_institucional].filter(Boolean);
      if (recipients.length) await access.admin.from('vigilancia_cola_correos').insert({
        tipo: 'CREDENCIALES', destinatarios: recipients,
        asunto: `VIGILANCIA OLANCHO | Nuevo código ${clinic.codigo}`,
        cuerpo_html: `<p>El nuevo código de cuatro dígitos para ${clinic.nombre} es <strong>${pin}</strong>.</p>`,
        referencia_tipo: 'CLINICA', referencia_id: clinic.id
      });
      return NextResponse.json({ ok: true, pin });
    }
    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error) {
    console.error('vigilancia-clinicas-patch', error);
    return NextResponse.json({ error: 'No fue posible actualizar la clínica.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const access = await requireVigilanciaUser(request, new Set(['ADMIN_GENERAL']));
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get('id');
  const { count } = await access.admin.from('vigilancia_boletines').select('id', { count: 'exact', head: true }).eq('clinica_id', id);
  if (count) return NextResponse.json({ error: 'No se puede eliminar una clínica con boletines. Suspéndala para conservar el historial.' }, { status: 409 });
  const { error } = await access.admin.from('vigilancia_clinicas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'No fue posible eliminar la clínica.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
