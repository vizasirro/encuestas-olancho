'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function CambiarContrasenaVigilancia(){
 const router=useRouter();const[p1,setP1]=useState(''),[p2,setP2]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function submit(e){e.preventDefault();setError('');if(p1.length<10){setError('Use al menos 10 caracteres.');return}if(p1!==p2){setError('Las contraseñas no coinciden.');return}setLoading(true);const s=createClient();const {data:{session}}=await s.auth.getSession();if(!session){router.replace('/vigilancia/login');return}const changed=await s.auth.updateUser({password:p1});if(changed.error){setError('No fue posible cambiar la contraseña.');setLoading(false);return}const res=await fetch('/api/vigilancia/perfil',{method:'PATCH',headers:{Authorization:`Bearer ${session.access_token}`}});if(!res.ok){setError('La contraseña cambió, pero no se pudo actualizar el perfil. Ingrese nuevamente.');setLoading(false);return}router.replace('/vigilancia/panel')}
 return <main className="vig-shell"><div className="vig-wrap" style={{maxWidth:'520px'}}><section className="vig-card"><span className="vig-badge">PRIMER INGRESO</span><h1>Cambiar contraseña</h1><p>La contraseña temporal debe sustituirse antes de utilizar el panel.</p><form onSubmit={submit} className="vig-grid" style={{gridTemplateColumns:'1fr'}}><label className="vig-field">Nueva contraseña<input type="password" minLength={10} required value={p1} onChange={e=>setP1(e.target.value)}/></label><label className="vig-field">Confirmar contraseña<input type="password" minLength={10} required value={p2} onChange={e=>setP2(e.target.value)}/></label>{error&&<p className="vig-error">{error}</p>}<button className="vig-button" disabled={loading}>{loading?'CAMBIANDO…':'CAMBIAR Y CONTINUAR'}</button></form></section></div></main>
}
