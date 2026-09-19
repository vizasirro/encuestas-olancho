create extension if not exists pgcrypto with schema extensions;

create table if not exists public.vigilancia_clinicas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo text not null default 'CLINICA' check (tipo in ('CLINICA','HOSPITAL','CENTRO_MEDICO','LABORATORIO','OTRO')),
  municipio text not null,
  direccion text,
  telefono text,
  email_institucional text,
  jefe_nombre text,
  jefe_cargo text,
  jefe_email text,
  jefe_telefono text,
  delegado_nombre text,
  delegado_cargo text,
  delegado_email text,
  delegado_telefono text,
  licencia_sanitaria text,
  licencia_vencimiento date,
  fuente_registro text not null default 'CENSO_PROVISIONAL',
  reunion_realizada_at timestamptz,
  reunion_evidencia text,
  qr_token uuid not null unique default gen_random_uuid(),
  pin_hash text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vigilancia_perfiles (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  telefono text,
  rol text not null check (rol in (
    'ADMIN_GENERAL','GESTOR_USUARIOS','VIGILANCIA_REGIONAL','REGIONAL',
    'ECOR','MUNICIPAL','RESPONSABLE_CLINICA','AUDITOR'
  )),
  alcance_ecor text,
  alcance_municipio text,
  clinica_id uuid references public.vigilancia_clinicas(id) on delete set null,
  activo boolean not null default true,
  debe_cambiar_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vigilancia_enfermedades (
  codigo text primary key,
  nombre text not null unique,
  orden integer not null unique,
  alerta_inmediata boolean not null default false,
  requiere_ficha boolean not null default false,
  ficha_nombre text,
  ficha_url text,
  activa boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.vigilancia_boletines (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.vigilancia_clinicas(id),
  anio integer not null check (anio between 2020 and 2100),
  semana_epidemiologica integer not null check (semana_epidemiologica between 1 and 53),
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR','ENVIADO','CERRADO')),
  negativa boolean not null default false,
  enviado_at timestamptz,
  cerrado_at timestamptz,
  modificado_despues_cierre boolean not null default false,
  motivo_modificacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinica_id, anio, semana_epidemiologica)
);

create table if not exists public.vigilancia_conteos (
  boletin_id uuid not null references public.vigilancia_boletines(id) on delete cascade,
  enfermedad_codigo text not null references public.vigilancia_enfermedades(codigo),
  cantidad integer not null default 0 check (cantidad >= 0),
  casos_inmediatos integer not null default 0 check (casos_inmediatos >= 0),
  updated_at timestamptz not null default now(),
  primary key (boletin_id, enfermedad_codigo),
  check (cantidad >= casos_inmediatos)
);

create table if not exists public.vigilancia_eventos_inmediatos (
  id uuid primary key default gen_random_uuid(),
  boletin_id uuid not null references public.vigilancia_boletines(id) on delete cascade,
  clinica_id uuid not null references public.vigilancia_clinicas(id),
  enfermedad_codigo text not null references public.vigilancia_enfermedades(codigo),
  paciente_id text not null,
  notificado_at timestamptz not null default now(),
  alerta_encolada_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clinica_id, enfermedad_codigo, paciente_id, boletin_id)
);

create table if not exists public.vigilancia_listas_nominales (
  id uuid primary key default gen_random_uuid(),
  boletin_id uuid not null references public.vigilancia_boletines(id) on delete cascade,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','RECIBIDA','REQUIERE_CORRECCION','VALIDADA','NO_APLICA')),
  correo_asunto text,
  recibido_at timestamptz,
  validado_at timestamptz,
  validado_por uuid references auth.users(id),
  observacion text,
  updated_at timestamptz not null default now(),
  unique (boletin_id)
);

create table if not exists public.vigilancia_fichas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.vigilancia_eventos_inmediatos(id) on delete set null,
  boletin_id uuid not null references public.vigilancia_boletines(id) on delete cascade,
  enfermedad_codigo text not null references public.vigilancia_enfermedades(codigo),
  paciente_id text not null,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','RECIBIDA','REQUIERE_CORRECCION','VALIDADA')),
  recibido_at timestamptz,
  validado_at timestamptz,
  validado_por uuid references auth.users(id),
  observacion text,
  updated_at timestamptz not null default now(),
  unique (boletin_id, enfermedad_codigo, paciente_id)
);

create table if not exists public.vigilancia_cola_correos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('CREDENCIALES','ALERTA_ROJA','CIERRE_SEMANAL','RECORDATORIO','CORRECCION','OTRO')),
  destinatarios text[] not null,
  asunto text not null,
  cuerpo_html text not null,
  referencia_tipo text,
  referencia_id uuid,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','ENVIANDO','ENVIADO','ERROR')),
  intentos integer not null default 0,
  ultimo_error text,
  programado_at timestamptz not null default now(),
  enviado_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vigilancia_intentos_acceso (
  id bigint generated by default as identity primary key,
  clinica_id uuid references public.vigilancia_clinicas(id) on delete cascade,
  qr_token uuid,
  exitoso boolean not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.vigilancia_auditoria (
  id bigint generated by default as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null,
  usuario_id uuid,
  clinica_id uuid,
  antes jsonb,
  despues jsonb,
  motivo text,
  origen text not null default 'SISTEMA',
  created_at timestamptz not null default now()
);

create table if not exists public.vigilancia_cierres_semanales (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.vigilancia_clinicas(id),
  anio integer not null check (anio between 2020 and 2100),
  semana_epidemiologica integer not null check (semana_epidemiologica between 1 and 53),
  resultado text not null check (resultado in ('NOTIFICO','NO_NOTIFICO')),
  boletin_id uuid references public.vigilancia_boletines(id) on delete set null,
  cerrado_at timestamptz not null default now(),
  correo_encolado boolean not null default false,
  unique(clinica_id,anio,semana_epidemiologica)
);

comment on table public.vigilancia_clinicas is 'Registro independiente de prestadores privados de Vigilancia Olancho.';
comment on column public.vigilancia_clinicas.pin_hash is 'Hash scrypt generado exclusivamente por el servidor; nunca contiene el PIN en texto claro.';
comment on table public.vigilancia_auditoria is 'Bitácora inmutable de cambios. Conservación operativa aprobada: 10 años.';

create index if not exists idx_vigilancia_boletines_semana on public.vigilancia_boletines(anio, semana_epidemiologica, estado);
create index if not exists idx_vigilancia_boletines_clinica on public.vigilancia_boletines(clinica_id, anio, semana_epidemiologica);
create index if not exists idx_vigilancia_eventos_busqueda on public.vigilancia_eventos_inmediatos(enfermedad_codigo, paciente_id, notificado_at desc);
create index if not exists idx_vigilancia_fichas_estado on public.vigilancia_fichas(estado, enfermedad_codigo);
create index if not exists idx_vigilancia_correos_pendientes on public.vigilancia_cola_correos(estado, programado_at);
create index if not exists idx_vigilancia_intentos_token on public.vigilancia_intentos_acceso(qr_token, created_at desc);
create index if not exists idx_vigilancia_auditoria_registro on public.vigilancia_auditoria(tabla, registro_id, created_at desc);
create index if not exists idx_vigilancia_cierres_semana on public.vigilancia_cierres_semanales(anio,semana_epidemiologica,resultado);
create unique index if not exists idx_vigilancia_perfiles_email on public.vigilancia_perfiles(lower(email));

alter table public.vigilancia_clinicas enable row level security;
alter table public.vigilancia_perfiles enable row level security;
alter table public.vigilancia_enfermedades enable row level security;
alter table public.vigilancia_boletines enable row level security;
alter table public.vigilancia_conteos enable row level security;
alter table public.vigilancia_eventos_inmediatos enable row level security;
alter table public.vigilancia_listas_nominales enable row level security;
alter table public.vigilancia_fichas enable row level security;
alter table public.vigilancia_cola_correos enable row level security;
alter table public.vigilancia_intentos_acceso enable row level security;
alter table public.vigilancia_auditoria enable row level security;
alter table public.vigilancia_cierres_semanales enable row level security;

revoke all on public.vigilancia_clinicas, public.vigilancia_perfiles, public.vigilancia_enfermedades,
  public.vigilancia_boletines, public.vigilancia_conteos, public.vigilancia_eventos_inmediatos,
  public.vigilancia_listas_nominales, public.vigilancia_fichas, public.vigilancia_cola_correos,
  public.vigilancia_intentos_acceso, public.vigilancia_auditoria from anon;
revoke all on public.vigilancia_cierres_semanales from anon;
revoke all on public.vigilancia_clinicas, public.vigilancia_perfiles, public.vigilancia_enfermedades,
  public.vigilancia_boletines, public.vigilancia_conteos, public.vigilancia_eventos_inmediatos,
  public.vigilancia_listas_nominales, public.vigilancia_fichas, public.vigilancia_cola_correos,
  public.vigilancia_intentos_acceso, public.vigilancia_auditoria from authenticated;
revoke all on public.vigilancia_cierres_semanales from authenticated;
grant all on public.vigilancia_clinicas, public.vigilancia_perfiles, public.vigilancia_enfermedades,
  public.vigilancia_boletines, public.vigilancia_conteos, public.vigilancia_eventos_inmediatos,
  public.vigilancia_listas_nominales, public.vigilancia_fichas, public.vigilancia_cola_correos,
  public.vigilancia_intentos_acceso, public.vigilancia_auditoria to service_role;
grant all on public.vigilancia_cierres_semanales to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.vigilancia_enfermedades
  (codigo, nombre, orden, alerta_inmediata, requiere_ficha)
values
  ('DIARREA_MENOR_1A','Diarrea menor de 1 año',1,false,false),
  ('DIARREA_1_4A','Diarrea de 1 a 4 años',2,false,false),
  ('DIARREA_5_14A','Diarrea de 5 a 14 años',3,false,false),
  ('DIARREA_15_MAS','Diarrea de 15 años y más',4,false,false),
  ('DISENTERIA_MENOR_15A','Disentería menor de 15 años',5,false,false),
  ('DISENTERIA_MAYOR_15A','Disentería de 15 años y más',6,false,false),
  ('COLERA','Cólera',7,true,true),
  ('PARALISIS_FLACIDA','Parálisis flácida aguda',8,true,true),
  ('SARAMPION','Sospecha de sarampión',9,true,true),
  ('TOSFERINA','Sospecha de tosferina',10,true,true),
  ('DIFTERIA','Difteria',11,true,true),
  ('TETANOS_NEONATAL','Tétanos neonatal',12,true,true),
  ('PAROTIDITIS','Parotiditis',13,false,true),
  ('RUBEOLA','Rubéola',14,true,true),
  ('FIEBRE_AMARILLA','Fiebre amarilla',15,true,true),
  ('SINDROME_RUBEOLA_CONGENITA','Síndrome de rubéola congénita',16,true,true),
  ('VARICELA','Varicela',17,false,false),
  ('MPOX','Mpox',18,true,true),
  ('MENINGITIS','Meningitis',19,true,true),
  ('DENGUE_SIN_SIGNOS','Dengue sin signos de alarma',20,true,true),
  ('DENGUE_CON_SIGNOS','Dengue con signos de alarma',21,true,true),
  ('DENGUE_GRAVE','Dengue grave',22,true,true),
  ('MALARIA','Malaria',23,true,true),
  ('CHIKUNGUNYA','Chikungunya',24,true,true),
  ('LEPTOSPIROSIS','Leptospirosis',25,true,true),
  ('LEISHMANIASIS','Leishmaniasis',26,false,true),
  ('ZIKA','Zika',27,true,true),
  ('ZIKA_EMBARAZADAS','Zika en embarazadas',28,true,true),
  ('SGB','Síndrome de Guillain-Barré',29,true,true),
  ('RABIA_HUMANA','Rabia humana',30,true,true),
  ('HEPATITIS','Hepatitis no especificada',31,false,true),
  ('HEPATITIS_A','Hepatitis A',32,false,true),
  ('HEPATITIS_B','Hepatitis B',33,false,true),
  ('HEPATITIS_C','Hepatitis C',34,false,true),
  ('HEPATITIS_D','Hepatitis D',35,false,true),
  ('INTOXICACION_PLAGUICIDAS','Intoxicación por plaguicidas',36,true,true),
  ('MORDEDURA_ANIMAL_RABIA','Mordedura por animal transmisor de rabia',37,true,true),
  ('MORDEDURA_SERPIENTE','Mordedura de serpiente',38,true,true),
  ('MORTALIDAD_MENOR_1A','Mortalidad menor de 1 año',39,true,true),
  ('MORTALIDAD_MATERNA','Mortalidad materna',40,true,true),
  ('MORTALIDAD_1_4A','Mortalidad de 1 a 4 años',41,true,true),
  ('COVID19','COVID-19',42,false,true),
  ('NEUMONIA_BRONCONEUMONIA','Neumonía/Bronconeumonía',43,false,false),
  ('PESTE','Peste',44,true,true),
  ('VIH','VIH',45,false,true),
  ('BRUCELOSIS','Brucelosis',46,false,true),
  ('TUBERCULOSIS','Tuberculosis',47,false,true),
  ('LEPRA','Lepra',48,false,true),
  ('SOSPECHA_DENGUE','Sospecha de dengue',49,true,true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  alerta_inmediata = excluded.alerta_inmediata,
  requiere_ficha = excluded.requiere_ficha,
  updated_at = now();

create or replace function public.vigilancia_registrar_evento_inmediato(
  p_boletin_id uuid, p_clinica_id uuid, p_enfermedad_codigo text, p_paciente_id text
)
returns table(evento_id uuid, duplicado boolean, cantidad integer, casos_inmediatos integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_evento_id uuid;
  v_cantidad integer;
  v_inmediatos integer;
begin
  select e.id into v_evento_id
  from public.vigilancia_eventos_inmediatos e
  where e.boletin_id=p_boletin_id and e.clinica_id=p_clinica_id
    and e.enfermedad_codigo=p_enfermedad_codigo and e.paciente_id=p_paciente_id;
  if v_evento_id is not null then
    return query select v_evento_id, true, 0, 0;
    return;
  end if;

  insert into public.vigilancia_eventos_inmediatos(boletin_id,clinica_id,enfermedad_codigo,paciente_id)
  values(p_boletin_id,p_clinica_id,p_enfermedad_codigo,p_paciente_id)
  on conflict(clinica_id,enfermedad_codigo,paciente_id,boletin_id) do nothing
  returning id into v_evento_id;

  if v_evento_id is null then
    select e.id into v_evento_id from public.vigilancia_eventos_inmediatos e
    where e.boletin_id=p_boletin_id and e.enfermedad_codigo=p_enfermedad_codigo
      and e.paciente_id=p_paciente_id;
    return query select v_evento_id, true, 0, 0;
    return;
  end if;

  insert into public.vigilancia_conteos(boletin_id,enfermedad_codigo,cantidad,casos_inmediatos)
  values(p_boletin_id,p_enfermedad_codigo,1,1)
  on conflict(boletin_id,enfermedad_codigo) do update
    set cantidad=public.vigilancia_conteos.cantidad+1,
        casos_inmediatos=public.vigilancia_conteos.casos_inmediatos+1,
        updated_at=now()
  returning public.vigilancia_conteos.cantidad, public.vigilancia_conteos.casos_inmediatos
  into v_cantidad,v_inmediatos;

  return query select v_evento_id, false, v_cantidad, v_inmediatos;
end;
$$;

create or replace function public.vigilancia_auditar_cambio()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_id text;
begin
  v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'boletin_id', to_jsonb(old)->>'boletin_id');
  insert into public.vigilancia_auditoria(tabla,registro_id,accion,usuario_id,antes,despues,origen)
  values (tg_table_name,v_id,tg_op,auth.uid(),case when tg_op='INSERT' then null else to_jsonb(old) end,
    case when tg_op='DELETE' then null else to_jsonb(new) end,'DATABASE');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vigilancia_clinicas_audit on public.vigilancia_clinicas;
create trigger trg_vigilancia_clinicas_audit after insert or update or delete on public.vigilancia_clinicas
for each row execute function public.vigilancia_auditar_cambio();
drop trigger if exists trg_vigilancia_boletines_audit on public.vigilancia_boletines;
create trigger trg_vigilancia_boletines_audit after insert or update or delete on public.vigilancia_boletines
for each row execute function public.vigilancia_auditar_cambio();
drop trigger if exists trg_vigilancia_conteos_audit on public.vigilancia_conteos;
create trigger trg_vigilancia_conteos_audit after insert or update or delete on public.vigilancia_conteos
for each row execute function public.vigilancia_auditar_cambio();
drop trigger if exists trg_vigilancia_eventos_audit on public.vigilancia_eventos_inmediatos;
create trigger trg_vigilancia_eventos_audit after insert or update or delete on public.vigilancia_eventos_inmediatos
for each row execute function public.vigilancia_auditar_cambio();
drop trigger if exists trg_vigilancia_fichas_audit on public.vigilancia_fichas;
create trigger trg_vigilancia_fichas_audit after insert or update or delete on public.vigilancia_fichas
for each row execute function public.vigilancia_auditar_cambio();

revoke all on function public.vigilancia_registrar_evento_inmediato(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.vigilancia_registrar_evento_inmediato(uuid,uuid,text,text) to service_role;
