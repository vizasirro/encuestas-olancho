'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '../../../utils/supabase/client';

export default function VigilanciaLogin() {
  const router=useRouter();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  async function submit(e){e.preventDefault();setLoading(true);setError('');try{const s=createClient();const result=await s.auth.signInWithPassword({email,password});if(result.error){setError('Usuario o contraseña incorrectos.');return}router.push('/vigilancia/panel');router.refresh()}catch{setError('No fue posible conectar con el servicio de acceso.')}finally{setLoading(false)}}
  return <main className="vig-shell"><div className="vig-wrap" style={{maxWidth:'520px'}}><section className="vig-card">
    <div className="vig-brand"><Image src="/viza-logo.svg" alt="Región Sanitaria de Olancho" width={72} height={72}/><div><span className="vig-badge">VIGILANCIA OLANCHO</span><h1 style={{fontSize:'30px'}}>Iniciar sesión</h1></div></div>
    <p>Acceso para usuarios administrativos, Vigilancia, ECOR, municipales y responsables de clínicas.</p>
    <form onSubmit={submit} className="vig-grid" style={{gridTemplateColumns:'1fr'}}>
      <label className="vig-field">Usuario / correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="vig-field">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error&&<p className="vig-error" role="alert">{error}</p>}<button className="vig-button" disabled={loading}>{loading?'INGRESANDO…':'INGRESAR'}</button>
    </form><div className="vig-nav"><a href="/recuperar-acceso">¿Olvidó su contraseña?</a><a href="/vigilancia">Volver</a></div>
  </section></div></main>;
}
