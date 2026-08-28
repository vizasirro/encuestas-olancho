'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const roles = [
  ['ADMIN_GENERAL','Administrador General'],
  ['ADMIN_ENCUESTAS','Administrador de Encuestas'],
  ['JEFE_ENCUESTADORES','Jefe de Encuestadores'],
  ['CONSULTA_ECOR','Consulta ECOR'],
  ['CONSULTA_MUNICIPAL','Consulta Municipal'],
  ['CONSULTA_ESTABLECIMIENTO','Consulta Establecimiento'],
  ['DIRECTOR_HOSPITALARIO','Director Hospitalario']
];

const nombresRol={ADMIN_GENERAL:'Administrador General',ADMIN_ENCUESTAS:'Administrador de Encuestas',JEFE_ENCUESTADORES:'Jefe de Encuestadores',ENCUESTADOR:'Encuestador',CONSULTA_ECOR:'Consulta ECOR',CONSULTA_MUNICIPAL:'Consulta Municipal',CONSULTA_ESTABLECIMIENTO:'Consulta Establecimiento',DIRECTOR_HOSPITALARIO:'Director Hospitalario'};
const vacio = { nombre:'', email:'', telefono:'', password:'', confirmar_password:'', rol:'ADMIN_ENCUESTAS', alcance_ecor:'', alcance_municipio:'', alcance_establecimiento_codigo:'', alcance_establecimiento_nombre:'', alcance_hospital_nombre:'' };

export default function UsuariosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(vacio);
  const [usuarios,setUsuarios]=useState([]);

  async function cargarUsuarios(){
    const supabase=createClient();
    const {data,error:e}=await supabase.rpc('listar_usuarios_admin');
    if(e){setError(e.message||'No fue posible cargar los usuarios.');return;}
    setUsuarios(Array.isArray(data)?data:[]);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data } = await supabase.rpc('obtener_mi_perfil');
      const perfil = Array.isArray(data) ? data[0] : null;
      if (!perfil || perfil.rol !== 'ADMIN_GENERAL' || !perfil.activo) { router.replace('/panel'); return; }
      await cargarUsuarios();
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  function setCampo(campo, valor) { setForm(prev => ({ ...prev, [campo]: valor })); }

  async function crear(e) {
    e.preventDefault(); setError(''); setOk('');
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (form.password !== form.confirmar_password) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setError('La sesión no es válida.'); setSaving(false); return; }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crear-usuario-perfil`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` }, body:JSON.stringify(form)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) setError(result.error || 'No fue posible crear el usuario.');
    else { setOk(`Usuario creado correctamente. El usuario de acceso es ${form.email}.`); setForm(vacio); await cargarUsuarios(); }
    setSaving(false);
  }

  if (loading) return <main className="shell"><section className="loginCard"><p>Preparando gestión de usuarios…</p></section></main>;
  const necesitaEcor = form.rol === 'CONSULTA_ECOR';
  const necesitaMunicipio = form.rol === 'CONSULTA_MUNICIPAL';
  const necesitaES = form.rol === 'CONSULTA_ESTABLECIMIENTO';
  const necesitaHospital = form.rol === 'DIRECTOR_HOSPITALARIO';

  return (
    <main className="shell"><section className="loginCard" style={{maxWidth:'900px'}}>
      <div className="badge">ENCUESTAS · OLANCHO</div><h1 style={{fontSize:'34px'}}>Gestionar usuarios</h1>
      <p>Creación de perfiles administrativos, de supervisión y de consulta.</p>
      <div style={{background:'#f7faf9',border:'1px solid #dce6e2',borderRadius:'12px',padding:'14px',margin:'18px 0'}}><strong>Encuestadores</strong><p style={{margin:'8px 0 0'}}>El perfil Encuestador se crea exclusivamente desde “Gestionar encuestadores”, porque requiere ID permanente y condición de externo a SESAL. Las designaciones operativas se realizan por separado.</p></div>
      <form onSubmit={crear} style={{display:'grid',gap:'14px'}}>
        <label><strong>Nombre completo</strong><input value={form.nombre} onChange={e=>setCampo('nombre',e.target.value)} required style={{width:'100%'}} /></label>
        <label><strong>Correo electrónico / Usuario</strong><input type="email" value={form.email} onChange={e=>setCampo('email',e.target.value)} required style={{width:'100%'}} /></label>
        <label><strong>Número de teléfono</strong><input type="tel" value={form.telefono} onChange={e=>setCampo('telefono',e.target.value)} required style={{width:'100%'}} placeholder="Ej. +504 9999-9999" /></label>
        <label><strong>Contraseña</strong><input type="password" value={form.password} onChange={e=>setCampo('password',e.target.value)} required minLength={8} autoComplete="new-password" style={{width:'100%'}} /><small>Mínimo 8 caracteres.</small></label>
        <label><strong>Verificar contraseña</strong><input type="password" value={form.confirmar_password} onChange={e=>setCampo('confirmar_password',e.target.value)} required minLength={8} autoComplete="new-password" style={{width:'100%'}} /></label>
        <label><strong>Perfil</strong><select value={form.rol} onChange={e=>setCampo('rol',e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #bdcbc6',borderRadius:'9px'}}>{roles.map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        {necesitaEcor && <label><strong>ECOR asignado</strong><input value={form.alcance_ecor} onChange={e=>setCampo('alcance_ecor',e.target.value)} required style={{width:'100%'}} /></label>}
        {necesitaMunicipio && <label><strong>Municipio asignado</strong><input value={form.alcance_municipio} onChange={e=>setCampo('alcance_municipio',e.target.value)} required style={{width:'100%'}} /></label>}
        {necesitaES && <><label><strong>Código RUPS del establecimiento</strong><input value={form.alcance_establecimiento_codigo} onChange={e=>setCampo('alcance_establecimiento_codigo',e.target.value)} required style={{width:'100%'}} /></label><label><strong>Nombre del establecimiento</strong><input value={form.alcance_establecimiento_nombre} onChange={e=>setCampo('alcance_establecimiento_nombre',e.target.value)} required style={{width:'100%'}} /></label></>}
        {necesitaHospital && <label><strong>Hospital asignado</strong><input value={form.alcance_hospital_nombre} onChange={e=>setCampo('alcance_hospital_nombre',e.target.value)} required style={{width:'100%'}} /></label>}
        <button type="submit" disabled={saving}>{saving ? 'CREANDO…' : 'CREAR USUARIO'}</button>
      </form>
      {error && <p role="alert" style={{marginTop:'16px',color:'#8f2f2f'}}><strong>{error}</strong></p>}
      {ok && <p role="status" style={{marginTop:'16px'}}><strong>{ok}</strong></p>}

      <div style={{marginTop:'30px',paddingTop:'22px',borderTop:'1px solid #dce6e2'}}>
        <h2>Usuarios creados</h2>
        <p style={{color:'#647a74'}}>Se muestran todos los perfiles registrados en Encuestas.</p>
        {usuarios.length===0?<p>No hay usuarios registrados.</p>:usuarios.map(u=><div key={u.id} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'14px',margin:'10px 0'}}>
          <p><strong>{u.nombre||'Sin nombre'}</strong></p>
          <p><strong>Usuario:</strong> {u.email||'—'}</p>
          <p><strong>Teléfono:</strong> {u.telefono||'—'}</p>
          <p><strong>Perfil:</strong> {nombresRol[u.rol]||u.rol}</p>
          <p><strong>Estado:</strong> {u.activo?'Activo':'Inactivo'}</p>
          {u.alcance_ecor&&<p><strong>ECOR:</strong> {u.alcance_ecor}</p>}
          {u.alcance_municipio&&<p><strong>Municipio:</strong> {u.alcance_municipio}</p>}
          {u.alcance_establecimiento_nombre&&<p><strong>Establecimiento:</strong> {u.alcance_establecimiento_nombre}{u.alcance_establecimiento_codigo?` · ${u.alcance_establecimiento_codigo}`:''}</p>}
          {u.alcance_hospital_nombre&&<p><strong>Hospital:</strong> {u.alcance_hospital_nombre}</p>}
        </div>)}
      </div>
      <a className="back" href="/panel">← Volver al panel</a>
    </section></main>
  );
}
