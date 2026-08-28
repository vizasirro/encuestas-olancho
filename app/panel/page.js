'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function Panel() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      const { data, error: profileError } = await supabase.rpc('obtener_mi_perfil');
      const profile = Array.isArray(data) ? data[0] : null;

      if (!active) return;

      setEmail(user.email || '');
      if (profileError) {
        setError('No fue posible leer el perfil del usuario.');
        setRole('SIN PERFIL');
      } else if (!profile) {
        setError('El usuario está autenticado, pero no tiene un perfil asignado.');
        setRole('SIN PERFIL');
      } else if (!profile.activo) {
        setError('Este usuario se encuentra inactivo.');
        setName(profile.nombre || '');
        setRole(profile.rol || 'SIN PERFIL');
      } else {
        setName(profile.nombre || '');
        setRole(profile.rol || 'SIN PERFIL');
      }

      setLoading(false);
    }

    loadSession();
    return () => { active = false; };
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  if (loading) {
    return <main className="shell"><section className="loginCard"><p>Verificando acceso…</p></section></main>;
  }

  return (
    <main className="shell">
      <section className="loginCard">
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Panel</h1>
        <p>Sesión activa.</p>
        {name && <p><strong>Nombre:</strong> {name}</p>}
        <p><strong>Usuario:</strong> {email}</p>
        <p><strong>Perfil:</strong> {role}</p>
        {error && <p role="alert">{error}</p>}
        {!error && <a className="button" href="/encuestas">VER ENCUESTAS</a>}
        <button type="button" onClick={signOut}>CERRAR SESIÓN</button>
      </section>
    </main>
  );
}
