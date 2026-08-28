'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function ActualizarContrasena(){
  const router=useRouter();
  const [password,setPassword]=useState('');
  const [confirmar,setConfirmar]=useState('');
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function cambiar(e){
    e.preventDefault(); setError(''); setMsg('');
    if(password.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return;}
    if(password!==confirmar){setError('Las contraseñas no coinciden.');return;}
    setLoading(true);
    const supabase=createClient();
    const { error: updateError }=await supabase.auth.updateUser({password});
    if(updateError) setError('No fue posible cambiar la contraseña. Solicita un nuevo enlace de recuperación.');
    else { setMsg('Contraseña actualizada correctamente.'); setTimeout(()=>router.replace('/login'),1200); }
    setLoading(false);
  }

  return <main className="shell"><section className="loginCard">
    <div className="badge">ENCUESTAS · OLANCHO</div>
    <h1>Cambiar contraseña</h1>
    <form onSubmit={cambiar}>
      <label>Nueva contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
      <label>Verificar contraseña<input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
      {error && <p role="alert" style={{color:'#8b2e2e'}}>{error}</p>}
      {msg && <p role="status"><strong>{msg}</strong></p>}
      <button type="submit" disabled={loading}>{loading?'CAMBIANDO…':'CAMBIAR CONTRASEÑA'}</button>
    </form>
    <a className="back" href="/login">← Volver a iniciar sesión</a>
  </section></main>;
}
