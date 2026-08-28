'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function Panel() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('perfiles')
        .select('rol, activo')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      setEmail(user.email || '');
      setRole(profile?.rol || 'SIN PERFIL');
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
        <p><strong>Usuario:</strong> {email}</p>
        <p><strong>Perfil:</strong> {role}</p>
        <button type="button" onClick={signOut}>CERRAR SESIÓN</button>
      </section>
    </main>
  );
}
