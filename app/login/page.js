'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const LOGO_SRC = 'data:image/webp;base64,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';

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
      <div style={{width:'100%',display:'flex',justifyContent:'center',marginBottom:'18px'}}>
        <img src={LOGO_SRC} alt="Secretaría de Salud · Región Sanitaria de Olancho" style={{display:'block',width:'100%',maxWidth:'720px',height:'auto',borderRadius:'8px'}} />
      </div>
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
