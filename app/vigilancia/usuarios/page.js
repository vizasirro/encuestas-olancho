'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { MUNICIPIOS_OLANCHO, VIGILANCIA_ROLE_OPTIONS } from '../../../utils/vigilancia/catalog';

const blank={nombre:'',email:'',telefono:'',rol:'RESPONSABLE_CLINICA',alcance_ecor:'',alcance_municipio:'',clinica_id:''};
const roleName=Object.fromEntries(VIGILANCIA_ROLE_OPTIONS);
async function authToken(){const s=createClient();const {data:{session}}=await s.auth.getSession();return session?.access_token||''}

export default function UsuariosVigilancia(){
 const[items,setItems]=useState([]),[clinicas,setClinicas]=useState([]),[form,setForm]=useState(blank),[error,setError]=useState(''),[ok,setOk]=useState(''),[saving,setSaving]=useState(false),[credential,setCredential]=useState(null);
 async function call(url,options={}){const t=await authToken();const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'No fue posible completar la operación.');return d}
 async function load(){try{const d=await call('/api/vigilancia/usuarios');setItems(d.usuarios||[]);setClinicas(d.clinicas||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);function field(k,v){setForm(f=>({...f,[k]:v}))}
 async function create(e){e.preventDefault();setSaving(true);setError('');setOk('');setCredential(null);try{const d=await call('/api/vigilancia/usuarios',{method:'POST',body:JSON.stringify(form)});setCredential({email:d.email,password:d.password});setOk('Usuario creado. Las credenciales quedaron en cola para envío desde la cuenta de Redes.');setForm(blank);await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
 async function toggle(id){setError('');try{await call('/api/vigilancia/usuarios',{method:'PATCH',body:JSON.stringify({usuario_id:id})});setOk('Estado del usuario actualizado.');await load()}catch(e){setError(e.message)}}
 async function remove(id,nombre){if(!confirm(`¿Eliminar el perfil de ${nombre}? Esta acción solo corresponde al Administrador General.`))return;try{await call(`/api/vigilancia/usuarios?id=${encodeURIComponent(id)}`,{method:'DELETE'});setOk('Usuario eliminado.');await load()}catch(e){setError(e.message)}}
 return <main className="vig-shell"><div className="vig-wrap"><div className="vig-header"><div><span className="vig-badge">GESTOR DE USUARIOS</span><h1>Usuarios de Vigilancia</h1><p>Creación, alcance, activación y suspensión.</p></div><a className="vig-button light" href="/vigilancia/panel">Volver</a></div>
 <section className="vig-card"><h2>Crear usuario</h2><p className="vig-note">Antes de crear al responsable de una clínica, debe estar registrada la reunión con el jefe o delegado.</p><form className="vig-grid" onSubmit={create}>
  <label className="vig-field">Nombre completo<input required value={form.nombre} onChange={e=>field('nombre',e.target.value)}/></label>
  <label className="vig-field">Correo / usuario<input required type="email" value={form.email} onChange={e=>field('email',e.target.value)}/></label>
  <label className="vig-field">Teléfono<input value={form.telefono} onChange={e=>field('telefono',e.target.value)}/></label>
  <label className="vig-field">Perfil<select value={form.rol} onChange={e=>field('rol',e.target.value)}>{VIGILANCIA_ROLE_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  {form.rol==='RESPONSABLE_CLINICA'&&<label className="vig-field">Clínica u hospital<select required value={form.clinica_id} onChange={e=>field('clinica_id',e.target.value)}><option value="">Seleccione…</option>{clinicas.filter(x=>x.activa).map(x=><option key={x.id} value={x.id}>{x.nombre} · {x.municipio}</option>)}</select></label>}
  {form.rol==='MUNICIPAL'&&<label className="vig-field">Municipio<select required value={form.alcance_municipio} onChange={e=>field('alcance_municipio',e.target.value)}><option value="">Seleccione…</option>{MUNICIPIOS_OLANCHO.map(x=><option key={x}>{x}</option>)}</select></label>}
  {form.rol==='ECOR'&&<label className="vig-field">ECOR<input required value={form.alcance_ecor} onChange={e=>field('alcance_ecor',e.target.value)}/></label>}
  <div className="vig-actions" style={{alignItems:'end'}}><button className="vig-button" disabled={saving}>{saving?'CREANDO…':'CREAR USUARIO'}</button></div>
 </form></section>
 {error&&<p className="vig-error">{error}</p>}{ok&&<p className="vig-ok">{ok}</p>}{credential&&<section className="vig-card vig-credential"><h2>Credencial temporal</h2><p>Usuario: <strong>{credential.email}</strong></p><p>Contraseña: <strong>{credential.password}</strong></p><p className="vig-note">Se muestra una sola vez. El usuario deberá cambiarla al primer ingreso.</p></section>}
 <section className="vig-card"><h2>Usuarios creados</h2><div className="vig-list">{items.map(u=><article className="vig-row" key={u.usuario_id}><div><h3>{u.nombre}</h3><p>{u.email} · {roleName[u.rol]||u.rol}</p><p>{u.vigilancia_clinicas?.nombre||u.alcance_municipio||u.alcance_ecor||'Cobertura regional'} · <strong>{u.activo?'Activo':'Suspendido'}</strong></p></div><div className="vig-actions"><button className={`vig-button ${u.activo?'danger':'secondary'}`} onClick={()=>toggle(u.usuario_id)}>{u.activo?'Suspender':'Activar'}</button><button className="vig-button light" onClick={()=>remove(u.usuario_id,u.nombre)}>Eliminar</button></div></article>)}</div></section>
 </div></main>
}
