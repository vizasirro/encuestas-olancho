'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true); setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage('Usuario o contraseña incorrectos, o el usuario aún no está habilitado.'); return; }
      router.push('/panel'); router.refresh();
    } catch { setMessage('No fue posible conectar con el servicio de acceso.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="shell"><section className="loginCard">
      <div className="badge">ENCUESTAS · OLANCHO</div>
      <h1>Iniciar sesión</h1>
      <p>Acceso para usuarios autorizados del sistema de Encuestas.</p>
      <form onSubmit={handleSubmit}>
        <label>Usuario (correo electrónico)<input type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Contraseña<input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {message ? <p role="alert" style={{margin:0,color:'#8b2e2e'}}>{message}</p> : null}
        <button type="submit" disabled={loading}>{loading ? 'INGRESANDO…' : 'INGRESAR'}</button>
      </form>
      <div style={{display:'grid',gap:'8px',marginTop:'16px'}}>
        <a className="back" href="/recuperar-acceso">¿Olvidaste tu contraseña?</a>
        <a className="back" href="/recuperar-usuario">¿Olvidaste tu usuario?</a>
      </div>
      <a className="back" href="/">← Volver al inicio</a>
    </section></main>
  );
}
