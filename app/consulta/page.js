'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const LABELS = {
  CONSULTA_ECOR: 'Consulta ECOR',
  CONSULTA_MUNICIPAL: 'Consulta Municipal',
  CONSULTA_ESTABLECIMIENTO: 'Consulta Establecimiento',
  DIRECTOR_HOSPITALARIO: 'Director Hospitalario'
};

export default function ConsultaPage() {
  const router = useRouter();
  const [acceso, setAcceso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');

      const { data, error: rpcError } = await supabase.rpc('obtener_mi_acceso_encuestas');
      const a = Array.isArray(data) ? data[0] : null;
      if (!a || !Object.keys(LABELS).includes(a.rol) || !a.activo) return router.replace('/panel');
      if (!active) return;
      if (rpcError) setError('No fue posible cargar el alcance autorizado.');
      else setAcceso(a);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="shell"><section className="loginCard"><p>Cargando acceso…</p></section></main>;

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'760px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1 style={{fontSize:'34px'}}>{LABELS[acceso?.rol] || 'Consulta'}</h1>
        {error && <p role="alert">{error}</p>}
        {acceso && (
          <>
            <p><strong>Usuario:</strong> {acceso.nombre}</p>
            {acceso.alcance_ecor && <p><strong>ECOR:</strong> {acceso.alcance_ecor}</p>}
            {acceso.alcance_municipio && <p><strong>Municipio:</strong> {acceso.alcance_municipio}</p>}
            {acceso.alcance_establecimiento_nombre && <p><strong>Establecimiento:</strong> {acceso.alcance_establecimiento_nombre}</p>}
            {acceso.alcance_hospital_nombre && <p><strong>Hospital:</strong> {acceso.alcance_hospital_nombre}</p>}
            <div style={{background:'#f7faf9',border:'1px solid #dce6e2',borderRadius:'12px',padding:'15px',margin:'18px 0'}}>
              <strong>Acceso de solo lectura</strong>
              <p style={{marginBottom:0}}>Este perfil podrá consultar tableros, porcentajes, semáforos y reportes únicamente dentro del alcance asignado. No puede aplicar encuestas, editar respuestas ni administrar usuarios.</p>
            </div>
          </>
        )}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
