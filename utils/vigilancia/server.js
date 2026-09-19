import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const VIGILANCIA_ROLES = new Set([
  'ADMIN_GENERAL', 'GESTOR_USUARIOS', 'VIGILANCIA_REGIONAL', 'REGIONAL',
  'ECOR', 'MUNICIPAL', 'RESPONSABLE_CLINICA', 'AUDITOR'
]);

export function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !anon || !service) throw new Error('Configuración de Supabase incompleta.');
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  };
}

export async function requireVigilanciaUser(request, allowedRoles = null) {
  const { auth, admin } = getClients();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { error: 'No autorizado.', status: 401 };
  const { data: { user }, error: userError } = await auth.auth.getUser(token);
  if (userError || !user) return { error: 'Sesión inválida.', status: 401 };

  const [{ data: perfil }, { data: perfilEncuestas }] = await Promise.all([
    admin.from('vigilancia_perfiles').select('*').eq('usuario_id', user.id).maybeSingle(),
    admin.from('perfiles').select('rol,activo,nombre,telefono').eq('id', user.id).maybeSingle()
  ]);

  let resolved = perfil;
  if (!resolved && perfilEncuestas?.activo && perfilEncuestas.rol === 'ADMIN_GENERAL') {
    resolved = {
      usuario_id: user.id,
      nombre: perfilEncuestas.nombre || user.email,
      email: user.email,
      telefono: perfilEncuestas.telefono,
      rol: 'ADMIN_GENERAL',
      activo: true
    };
  }
  if (!resolved || !resolved.activo || !VIGILANCIA_ROLES.has(resolved.rol)) {
    return { error: 'El usuario no tiene un perfil activo de Vigilancia.', status: 403 };
  }
  if (allowedRoles && !allowedRoles.has(resolved.rol)) {
    return { error: 'El perfil no está autorizado para esta operación.', status: 403 };
  }
  return { user, perfil: resolved, admin };
}

export function getHondurasEpiWeek(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
  const local = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() + 4 - day);
  const weekYear = local.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((local - yearStart) / 86400000) + 1) / 7);
  return { year: weekYear, week };
}

export function hashIp(request) {
  const raw = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(`${process.env.VIGILANCIA_IP_SALT || 'vigilancia'}:${raw}`).digest('hex');
}

export function cleanEmails(values) {
  return [...new Set(values.flatMap(v => String(v || '').split(',')).map(v => v.trim().toLowerCase()).filter(v => /^\S+@\S+\.\S+$/.test(v)))];
}

export function makePinHash(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('El código debe contener exactamente cuatro dígitos.');
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(String(pin), salt, 32).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

export function verifyPin(pin, encoded) {
  try {
    const [algorithm, salt, digest] = String(encoded || '').split('$');
    if (algorithm !== 'scrypt' || !salt || !digest || !/^\d{4}$/.test(String(pin || ''))) return false;
    const expected = Buffer.from(digest, 'hex');
    const actual = scryptSync(String(pin), salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function generatePin() {
  return String(randomInt(1000, 10000));
}

export function generateTemporaryPassword() {
  return `Vz!${randomBytes(9).toString('base64url')}9a`;
}

export function nullable(value) {
  const clean = String(value ?? '').trim();
  return clean || null;
}

export function scopeAllows(perfil, municipio, clinicaId = null) {
  if (!perfil) return false;
  if (['ADMIN_GENERAL','GESTOR_USUARIOS','VIGILANCIA_REGIONAL','REGIONAL','AUDITOR'].includes(perfil.rol)) return true;
  if (perfil.rol === 'ECOR') return true;
  if (perfil.rol === 'MUNICIPAL') return !perfil.alcance_municipio || perfil.alcance_municipio === municipio;
  if (perfil.rol === 'RESPONSABLE_CLINICA') return Boolean(clinicaId && perfil.clinica_id === clinicaId);
  return false;
}

export async function authenticateClinic(admin, token, pin, request) {
  const ipHash = hashIp(request);
  const { data: clinic, error } = await admin.from('vigilancia_clinicas')
    .select('id,codigo,nombre,municipio,email_institucional,jefe_email,delegado_email,pin_hash,activa')
    .eq('qr_token', token).maybeSingle();
  if (error) throw error;

  if (!clinic || !clinic.activa) {
    await admin.from('vigilancia_intentos_acceso').insert({ qr_token: token, exitoso: false, ip_hash: ipHash });
    return null;
  }
  const { count, error: countError } = await admin.from('vigilancia_intentos_acceso')
    .select('id', { count: 'exact', head: true }).eq('clinica_id', clinic.id).eq('exitoso', false)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
  if (countError) throw countError;
  const valid = Number(count || 0) < 5 && verifyPin(pin, clinic.pin_hash);
  await admin.from('vigilancia_intentos_acceso').insert({ clinica_id: clinic.id, qr_token: token, exitoso: valid, ip_hash: ipHash });
  if (!valid) return null;
  const { pin_hash: _secret, activa: _active, id, ...safe } = clinic;
  return { clinica_id: id, ...safe };
}
