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
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { router.replace('/login'); return; }
      const { data, error: profileError } = await supabase.rpc('obtener_mi_perfil');
      const profile = Array.isArray(data) ? data[0] : null;
      if (!active) return;
      setEmail(user.email || '');
      if (profileError) { setError('No fue posible leer el perfil del usuario.'); setRole('SIN PERFIL'); }
      else if (!profile) { setError('El usuario está autenticado, pero no tiene un perfil asignado.'); setRole('SIN PERFIL'); }
      else if (!profile.activo) { setError('Este usuario se encuentra inactivo.'); setName(profile.nombre || ''); setRole(profile.rol || 'SIN PERFIL'); }
      else { setName(profile.nombre || ''); setRole(profile.rol || 'SIN PERFIL'); }
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

  function resetTests() {
    if (role !== 'ADMIN_GENERAL') return;
    if (!window.confirm('RESETEO DE PRUEBAS\n\nEsta acción limpiará los datos temporales de prueba del navegador. No elimina usuarios, perfiles, catálogos ni instrumentos oficiales. ¿Desea continuar?')) return;
    if (!window.confirm('Confirme nuevamente el RESETEO DE PRUEBAS.')) return;
    try { window.localStorage.clear(); window.sessionStorage.clear(); setResetMessage('Entorno de prueba reiniciado.'); }
    catch { setResetMessage('No fue posible completar el reseteo local.'); }
  }

  if (loading) return <main className="shell"><section className="loginCard"><p>Verificando acceso…</p></section></main>;

  const esAplicador = role === 'ENCUESTADOR' || role === 'JEFE_ENCUESTADORES';
  const esConsulta = ['CONSULTA_ECOR','CONSULTA_MUNICIPAL','CONSULTA_ESTABLECIMIENTO','DIRECTOR_HOSPITALARIO'].includes(role);

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

        {!error && role === 'ADMIN_GENERAL' && (
          <div style={{display:'grid',gap:'10px'}}>
            <a className="button" href="/encuestas">VER ENCUESTAS</a>
            <a className="button" href="/usuarios">GESTIONAR USUARIOS</a>
            <a className="button" href="/encuestadores">GESTIONAR ENCUESTADORES</a>
            <a className="button" href="/roles">TIPOS DE USUARIO</a>
          </div>
        )}

        {!error && role === 'ADMIN_ENCUESTAS' && <a className="button" href="/encuestadores">GESTIONAR ENCUESTADORES</a>}
        {!error && role === 'JEFE_ENCUESTADORES' && <a className="button" href="/jefe-encuestadores">PANEL JEFE</a>}
        {!error && role === 'ENCUESTADOR' && <a className="button" href="/encuestador">APLICAR ENCUESTAS</a>}
        {!error && esConsulta && <a className="button" href="/consulta">VER RESULTADOS</a>}
        {!error && !esAplicador && !esConsulta && !['ADMIN_GENERAL','ADMIN_ENCUESTAS'].includes(role) && <a className="button" href="/encuestas">VER ENCUESTAS</a>}

        {!error && role === 'ADMIN_GENERAL' && (
          <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #dce6e2'}}>
            <button type="button" onClick={resetTests} style={{background:'#8f2f2f'}}>RESETEAR PRUEBAS</button>
            <p style={{fontSize:'13px',color:'#647a74',marginTop:'8px'}}>Conserva usuarios, perfiles, catálogos e instrumentos oficiales.</p>
            {resetMessage && <p role="status"><strong>{resetMessage}</strong></p>}
          </div>
        )}

        <button type="button" onClick={signOut}>CERRAR SESIÓN</button>
      </section>
    </main>
  );
}
