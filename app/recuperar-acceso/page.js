'use client';

import { useState } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function RecuperarAcceso() {
  const [email,setEmail]=useState('');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);

  async function enviar(e){
    e.preventDefault(); setLoading(true); setMsg('');
    const supabase=createClient();
    const redirectTo=`${window.location.origin}/actualizar-contrasena`;
    await supabase.auth.resetPasswordForEmail(email,{redirectTo});
    setMsg('Si el correo está registrado, recibirás un enlace para cambiar la contraseña.');
    setLoading(false);
  }

  return <main className="shell"><section className="loginCard">
    <div className="badge">ENCUESTAS · OLANCHO</div>
    <h1>Recuperar contraseña</h1>
    <p>Ingresa el correo electrónico que utilizas como usuario.</p>
    <form onSubmit={enviar}>
      <label>Usuario / correo electrónico<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <button type="submit" disabled={loading}>{loading?'ENVIANDO…':'ENVIAR ENLACE'}</button>
    </form>
    {msg && <p role="status"><strong>{msg}</strong></p>}
    <a className="back" href="/login">← Volver a iniciar sesión</a>
  </section></main>;
}
