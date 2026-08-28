'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function EncuestadorPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [asignacion, setAsignacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: perfilData, error: perfilError } = await supabase.rpc('obtener_mi_perfil');
      const p = Array.isArray(perfilData) ? perfilData[0] : null;
      if (perfilError || !p) {
        if (active) setError('No fue posible identificar el perfil del usuario.');
        setLoading(false);
        return;
      }

      if (!['ENCUESTADOR','JEFE_ENCUESTADORES'].includes(p.rol)) {
        router.replace('/panel');
        return;
      }

      const { data: asigData, error: asigError } = await supabase.rpc('obtener_mi_asignacion_encuestador');
      const a = Array.isArray(asigData) ? asigData[0] : null;
      if (!active) return;
      setPerfil(p);
      if (asigError) setError('No fue posible leer la asignación del encuestador.');
      else setAsignacion(a || null);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  async function nuevaEncuesta() {
    setError('');
    setIniciando(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('iniciar_encuesta_asignada');
    const sesion = Array.isArray(data) ? data[0] : null;
    if (rpcError || !sesion) {
      setError(rpcError?.message || 'No fue posible iniciar la encuesta.');
      setIniciando(false);
      return;
    }
    router.push(`/encuestas/${sesion.encuesta_codigo}?sesion=${sesion.sesion_id}&folio=${encodeURIComponent(sesion.folio)}&modo=aplicacion`);
  }

  if (loading) return <main className="shell"><section className="loginCard"><p>Preparando módulo del encuestador…</p></section></main>;

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'700px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Encuestador</h1>
        {perfil?.nombre && <p><strong>Nombre:</strong> {perfil.nombre}</p>}
        {asignacion ? (
          <>
            <div style={{border:'1px solid #dce6e2',borderRadius:'14px',padding:'18px',margin:'20px 0'}}>
              <p><strong>ID:</strong> {asignacion.encuestador_id}</p>
              <p><strong>Asignación:</strong> {asignacion.establecimiento_nombre}</p>
              <p><strong>Tipo de encuesta:</strong> {asignacion.tipo_encuesta === 'AMBULATORIA' ? 'Atención Ambulatoria' : 'Hospitalización / Internamiento'}</p>
              <p style={{marginBottom:0,color:'#647a74'}}>El tipo de encuesta y el establecimiento están preasignados y no pueden ser cambiados desde este perfil.</p>
            </div>
            <button type="button" onClick={nuevaEncuesta} disabled={iniciando} style={{width:'100%',fontSize:'18px',padding:'16px'}}>
              {iniciando ? 'INICIANDO…' : 'NUEVA ENCUESTA'}
            </button>
          </>
        ) : (
          <p role="alert">No tienes una asignación activa. El Jefe de Encuestadores debe asignarte establecimiento y tipo de encuesta antes de iniciar.</p>
        )}
        {error && <p role="alert" style={{marginTop:'18px'}}>{error}</p>}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
