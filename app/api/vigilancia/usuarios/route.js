import { NextResponse } from 'next/server';
import { generateTemporaryPassword, nullable, requireVigilanciaUser, VIGILANCIA_ROLES } from '../../../../utils/vigilancia/server';

const MANAGERS = new Set(['ADMIN_GENERAL','GESTOR_USUARIOS']);

export async function GET(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const [{ data: usuarios, error }, { data: clinicas }] = await Promise.all([
    access.admin.from('vigilancia_perfiles').select('*,vigilancia_clinicas(nombre,codigo,municipio)').order('nombre'),
    access.admin.from('vigilancia_clinicas').select('id,nombre,codigo,municipio,activa').order('nombre')
  ]);
  if (error) return NextResponse.json({ error: 'No fue posible cargar los usuarios.' }, { status: 500 });
  return NextResponse.json({ usuarios: usuarios || [], clinicas: clinicas || [] });
}

export async function POST(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const body = await request.json();
    const nombre = String(body.nombre || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const rol = String(body.rol || '');
    if (!nombre || !/^\S+@\S+\.\S+$/.test(email) || !VIGILANCIA_ROLES.has(rol)) return NextResponse.json({ error: 'Nombre, correo y perfil son obligatorios.' }, { status: 400 });
    if (rol === 'ADMIN_GENERAL' && access.perfil.rol !== 'ADMIN_GENERAL') return NextResponse.json({ error: 'Solo el administrador general puede crear otro administrador.' }, { status: 403 });
    if (rol === 'MUNICIPAL' && !body.alcance_municipio) return NextResponse.json({ error: 'Seleccione el municipio del usuario.' }, { status: 400 });
    if (rol === 'RESPONSABLE_CLINICA' && !body.clinica_id) return NextResponse.json({ error: 'Seleccione la clínica que supervisará.' }, { status: 400 });
    const password = generateTemporaryPassword();
    const created = await access.admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { app: 'vigilancia_olancho' } });
    if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message?.includes('registered') ? 'Ese correo ya está registrado. Use otro correo o solicite vinculación al administrador.' : 'No fue posible crear la cuenta de acceso.' }, { status: 409 });
    const userId = created.data.user.id;
    const profile = {
      usuario_id: userId, nombre, email, telefono: nullable(body.telefono), rol,
      alcance_ecor: nullable(body.alcance_ecor), alcance_municipio: nullable(body.alcance_municipio),
      clinica_id: rol === 'RESPONSABLE_CLINICA' ? body.clinica_id : null,
      activo: true, debe_cambiar_password: true
    };
    const inserted = await access.admin.from('vigilancia_perfiles').insert(profile);
    if (inserted.error) {
      await access.admin.auth.admin.deleteUser(userId);
      throw inserted.error;
    }
    await access.admin.from('vigilancia_cola_correos').insert({
      tipo: 'CREDENCIALES', destinatarios: [email],
      asunto: 'VIGILANCIA OLANCHO | Usuario temporal',
      cuerpo_html: `<h2>VIGILANCIA OLANCHO</h2><p>Usuario: <strong>${email}</strong></p><p>Contraseña temporal: <strong>${password}</strong></p><p>Debe cambiarla al ingresar por primera vez.</p>`,
      referencia_tipo: 'USUARIO', referencia_id: userId
    });
    return NextResponse.json({ ok: true, usuario_id: userId, email, password }, { status: 201 });
  } catch (error) {
    console.error('vigilancia-usuarios-post', error);
    return NextResponse.json({ error: 'No fue posible crear el usuario.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const access = await requireVigilanciaUser(request, MANAGERS);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json();
  const id = String(body.usuario_id || '');
  const { data: target } = await access.admin.from('vigilancia_perfiles').select('*').eq('usuario_id', id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
  if (target.rol === 'ADMIN_GENERAL' && access.perfil.rol !== 'ADMIN_GENERAL') return NextResponse.json({ error: 'Solo el administrador general puede cambiar otro administrador.' }, { status: 403 });
  const { error } = await access.admin.from('vigilancia_perfiles').update({ activo: !target.activo, updated_at: new Date().toISOString() }).eq('usuario_id', id);
  if (error) return NextResponse.json({ error: 'No fue posible cambiar el estado.' }, { status: 500 });
  return NextResponse.json({ ok: true, activo: !target.activo });
}

export async function DELETE(request) {
  const access = await requireVigilanciaUser(request, new Set(['ADMIN_GENERAL']));
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get('id');
  if (id === access.user.id) return NextResponse.json({ error: 'No puede eliminar su propia cuenta.' }, { status: 409 });
  const { data: shared } = await access.admin.from('perfiles').select('id').eq('id', id).maybeSingle();
  const { error } = await access.admin.from('vigilancia_perfiles').delete().eq('usuario_id', id);
  if (error) return NextResponse.json({ error: 'No fue posible eliminar el perfil.' }, { status: 500 });
  if (!shared) await access.admin.auth.admin.deleteUser(id);
  return NextResponse.json({ ok: true, auth_conservado: Boolean(shared) });
}
