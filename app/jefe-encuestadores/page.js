'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function JefePage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      const { data } = await supabase.rpc('obtener_mi_perfil');
      const p = Array.isArray(data) ? data[0] : null;
      if (!p || p.rol !== 'JEFE_ENCUESTADORES' || !p.activo) return router.replace('/panel');
      if (!active) return;
      setPerfil(p);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="shell"><section className="loginCard"><p>Cargando panel del jefe…</p></section></main>;

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'760px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1 style={{fontSize:'34px'}}>Jefe de Encuestadores</h1>
        {perfil?.nombre && <p><strong>Nombre:</strong> {perfil.nombre}</p>}
        <div style={{background:'#f7faf9',border:'1px solid #dce6e2',borderRadius:'12px',padding:'15px',margin:'18px 0'}}>
          <strong>Funciones habilitadas</strong>
          <p style={{marginBottom:0}}>Planificación de metas, supervisión de encuestadores, asignación previa del tipo de encuesta y aplicación directa de encuestas. Este perfil no crea usuarios.</p>
        </div>
        <a className="button" href="/encuestador">APLICAR ENCUESTAS</a>
        <a className="button" href="/encuestadores" style={{marginLeft:'10px'}}>VER ENCUESTADORES</a>
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
