import { NextResponse } from 'next/server';
import { requireVigilanciaUser } from '../../../../utils/vigilancia/server';

export async function GET(request) {
  const access = await requireVigilanciaUser(request);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json({ perfil: access.perfil });
}

export async function PATCH(request) {
  const access = await requireVigilanciaUser(request);
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await access.admin.from('vigilancia_perfiles')
    .update({ debe_cambiar_password: false, updated_at: new Date().toISOString() })
    .eq('usuario_id', access.user.id);
  if (error) return NextResponse.json({ error: 'No fue posible confirmar el cambio de contraseña.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
