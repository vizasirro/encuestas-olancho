'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { createClient } from '../../../utils/supabase/client';
import { MUNICIPIOS_OLANCHO } from '../../../utils/vigilancia/catalog';

const empty = { codigo:'',nombre:'',tipo:'CLINICA',municipio:'Juticalpa',direccion:'',telefono:'',email_institucional:'',jefe_nombre:'',jefe_cargo:'Jefe del establecimiento',jefe_email:'',jefe_telefono:'',delegado_nombre:'',delegado_cargo:'',delegado_email:'',delegado_telefono:'',licencia_sanitaria:'',licencia_vencimiento:'',fuente_registro:'CENSO_PROVISIONAL',reunion_realizada_at:'',reunion_evidencia:'' };

async function token(){const s=createClient();const {data:{session}}=await s.auth.getSession();return session?.access_token||''}

export default function ClinicasVigilancia(){
 const[items,setItems]=useState([]),[form,setForm]=useState(empty),[error,setError]=useState(''),[ok,setOk]=useState(''),[saving,setSaving]=useState(false),[cred,setCred]=useState(null),[qr,setQr]=useState({});
 async function call(url,options={}){const access=await token();const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${access}`,...options.headers}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'No fue posible completar la operación.');return data}
 async function load(){try{const data=await call('/api/vigilancia/clinicas');setItems(data.clinicas||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 useEffect(()=>{let active=true;(async()=>{const mapped={};for(const c of items){const url=`${window.location.origin}/vigilancia/notificar/${c.qr_token}`;mapped[c.id]=await QRCode.toDataURL(url,{width:220,margin:1,errorCorrectionLevel:'M'})}if(active)setQr(mapped)})();return()=>{active=false}},[items]);
 function field(k,v){setForm(f=>({...f,[k]:v}))}
 async function create(e){e.preventDefault();setSaving(true);setError('');setOk('');setCred(null);try{const data=await call('/api/vigilancia/clinicas',{method:'POST',body:JSON.stringify(form)});setCred({pin:data.pin,url:data.qr_url,nombre:data.clinica.nombre,codigo:data.clinica.codigo});setOk('Clínica creada. El PIN se muestra una sola vez y quedó en cola para correo.');setForm(empty);await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
 async function action(id,type){setError('');setOk('');try{const data=await call('/api/vigilancia/clinicas',{method:'PATCH',body:JSON.stringify({id,action:type})});if(data.pin)setCred({pin:data.pin,nombre:items.find(x=>x.id===id)?.nombre,codigo:items.find(x=>x.id===id)?.codigo,url:`${window.location.origin}/vigilancia/notificar/${items.find(x=>x.id===id)?.qr_token}`});setOk(type==='RESET_PIN'?'Código renovado y correo puesto en cola.':'Estado actualizado.');await load()}catch(e){setError(e.message)}}
 return <main className="vig-shell"><div className="vig-wrap"><div className="vig-header"><div><span className="vig-badge">GESTOR DE USUARIOS</span><h1>Clínicas y hospitales privados</h1><p>Registro posterior a reunión con el jefe o delegado del establecimiento.</p></div><a className="vig-button light" href="/vigilancia/panel">Volver</a></div>
 <section className="vig-card"><h2>Registrar establecimiento</h2><form onSubmit={create} className="vig-grid">
  <label className="vig-field">Código institucional<input required value={form.codigo} onChange={e=>field('codigo',e.target.value)}/></label>
  <label className="vig-field">Nombre completo<input required value={form.nombre} onChange={e=>field('nombre',e.target.value)}/></label>
  <label className="vig-field">Tipo<select value={form.tipo} onChange={e=>field('tipo',e.target.value)}><option value="CLINICA">Clínica</option><option value="HOSPITAL">Hospital</option><option value="CENTRO_MEDICO">Centro médico</option><option value="LABORATORIO">Laboratorio</option><option value="OTRO">Otro</option></select></label>
  <label className="vig-field">Municipio<select value={form.municipio} onChange={e=>field('municipio',e.target.value)}>{MUNICIPIOS_OLANCHO.map(x=><option key={x}>{x}</option>)}</select></label>
  <label className="vig-field">Dirección<input value={form.direccion} onChange={e=>field('direccion',e.target.value)}/></label>
  <label className="vig-field">Teléfono institucional<input value={form.telefono} onChange={e=>field('telefono',e.target.value)}/></label>
  <label className="vig-field">Correo institucional<input type="email" value={form.email_institucional} onChange={e=>field('email_institucional',e.target.value)}/></label>
  <label className="vig-field">Jefe o responsable<input required value={form.jefe_nombre} onChange={e=>field('jefe_nombre',e.target.value)}/></label>
  <label className="vig-field">Cargo<input value={form.jefe_cargo} onChange={e=>field('jefe_cargo',e.target.value)}/></label>
  <label className="vig-field">Correo del responsable<input required type="email" value={form.jefe_email} onChange={e=>field('jefe_email',e.target.value)}/></label>
  <label className="vig-field">Teléfono del responsable<input required value={form.jefe_telefono} onChange={e=>field('jefe_telefono',e.target.value)}/></label>
  <label className="vig-field">Delegado<input value={form.delegado_nombre} onChange={e=>field('delegado_nombre',e.target.value)}/></label>
  <label className="vig-field">Correo del delegado<input type="email" value={form.delegado_email} onChange={e=>field('delegado_email',e.target.value)}/></label>
  <label className="vig-field">Teléfono del delegado<input value={form.delegado_telefono} onChange={e=>field('delegado_telefono',e.target.value)}/></label>
  <label className="vig-field">Licencia sanitaria<input value={form.licencia_sanitaria} onChange={e=>field('licencia_sanitaria',e.target.value)}/></label>
  <label className="vig-field">Vencimiento de licencia<input type="date" value={form.licencia_vencimiento} onChange={e=>field('licencia_vencimiento',e.target.value)}/></label>
  <label className="vig-field">Fuente del registro<select value={form.fuente_registro} onChange={e=>field('fuente_registro',e.target.value)}><option value="CENSO_PROVISIONAL">Censo provisional</option><option value="LICENCIA_SANITARIA">Listado con licencia sanitaria</option></select></label>
  <label className="vig-field">Fecha y hora de reunión<input required type="datetime-local" value={form.reunion_realizada_at} onChange={e=>field('reunion_realizada_at',e.target.value)}/></label>
  <label className="vig-field">Evidencia o minuta<textarea value={form.reunion_evidencia} onChange={e=>field('reunion_evidencia',e.target.value)} placeholder="Número de minuta, enlace o ubicación del respaldo"/></label>
  <div className="vig-actions" style={{alignItems:'end'}}><button className="vig-button" disabled={saving}>{saving?'GUARDANDO…':'CREAR CLÍNICA Y ACCESO'}</button></div>
 </form></section>
 {error&&<p className="vig-error" role="alert">{error}</p>}{ok&&<p className="vig-ok" role="status">{ok}</p>}
 {cred&&<section className="vig-card vig-credential"><h2>Credencial temporal</h2><p><strong>{cred.nombre}</strong> · {cred.codigo}</p><p className="vig-pin">{cred.pin}</p><p>{cred.url}</p><p className="vig-note">Entregue esta credencial según el instructivo. El PIN no volverá a mostrarse en el sistema.</p></section>}
 <section className="vig-card"><div className="vig-header"><div><h2>Registro actual</h2><p>{items.length} establecimientos</p></div><button className="vig-button secondary" onClick={()=>window.print()}>IMPRIMIR QR</button></div>
  <div className="vig-list">{items.map(c=><article className="vig-clinic" key={c.id}><div>{qr[c.id]&&<img src={qr[c.id]} alt={`QR de ${c.nombre}`} width="130" height="130"/>}</div><div><h3>{c.nombre}</h3><p><strong>{c.codigo}</strong> · {c.tipo} · {c.municipio}</p><p>{c.jefe_nombre} · {c.jefe_email} · {c.jefe_telefono}</p><p>Licencia: {c.licencia_sanitaria||'Pendiente de listado oficial'} · Estado: <strong>{c.activa?'Activo':'Suspendido'}</strong></p><div className="vig-actions"><button className="vig-button light" onClick={()=>action(c.id,'RESET_PIN')}>Cambiar PIN</button><button className={`vig-button ${c.activa?'danger':'secondary'}`} onClick={()=>action(c.id,'TOGGLE')}>{c.activa?'Suspender':'Activar'}</button></div></div></article>)}</div>
 </section></div></main>
}
