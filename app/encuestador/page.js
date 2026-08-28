'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function EncuestadorPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [designaciones, setDesignaciones] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: perfilData, error: perfilError } = await supabase.rpc('obtener_mi_perfil');
      const p = Array.isArray(perfilData) ? perfilData[0] : null;
      if (perfilError || !p) { if (active) setError('No fue posible identificar el perfil del usuario.'); setLoading(false); return; }
      if (!['ENCUESTADOR','JEFE_ENCUESTADORES'].includes(p.rol)) { router.replace('/panel'); return; }
      const { data: asigData, error: asigError } = await supabase.rpc('obtener_mis_designaciones_encuestador');
      if (!active) return;
      setPerfil(p);
      if (asigError) setError('No fue posible leer las designaciones del encuestador.');
      else {
        const lista = Array.isArray(asigData) ? asigData : [];
        setDesignaciones(lista);
        if (lista.length === 1) setSeleccion(String(lista[0].id));
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  async function nuevaEncuesta() {
    if (!seleccion) { setError('Seleccione la designación con la que realizará la encuesta.'); return; }
    setError(''); setIniciando(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('iniciar_encuesta_asignada', { p_designacion_id: Number(seleccion) });
    const sesion = Array.isArray(data) ? data[0] : null;
    if (rpcError || !sesion) { setError(rpcError?.message || 'No fue posible iniciar la encuesta.'); setIniciando(false); return; }
    router.push(`/encuestas/${sesion.encuesta_codigo}?sesion=${sesion.sesion_id}&folio=${encodeURIComponent(sesion.folio)}&modo=aplicacion`);
  }

  if (loading) return <main className="shell"><section className="loginCard"><p>Preparando módulo del encuestador…</p></section></main>;

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'760px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Encuestador</h1>
        {perfil?.nombre && <p><strong>Nombre:</strong> {perfil.nombre}</p>}
        {designaciones.length > 0 ? (
          <>
            <label style={{display:'block',fontWeight:700,margin:'18px 0 8px'}}>Designación para esta encuesta</label>
            <select value={seleccion} onChange={e=>setSeleccion(e.target.value)} style={{width:'100%',padding:'12px'}}>
              <option value="">Seleccione designación</option>
              {designaciones.map(d => <option key={d.id} value={d.id}>{d.establecimiento_nombre} · {d.tipo_encuesta==='AMBULATORIA'?'Atención Ambulatoria':'Hospitalización / Internamiento'} · {d.fecha_inicio_programada||'sin inicio'} a {d.fecha_fin_programada||'sin fin'}</option>)}
            </select>
            {seleccion && (()=>{const d=designaciones.find(x=>String(x.id)===seleccion);return d?<div style={{border:'1px solid #dce6e2',borderRadius:'14px',padding:'18px',margin:'20px 0'}}><p><strong>ID:</strong> {d.encuestador_id}</p><p><strong>Establecimiento:</strong> {d.establecimiento_nombre}</p><p><strong>Tipo:</strong> {d.tipo_encuesta==='AMBULATORIA'?'Atención Ambulatoria':'Hospitalización / Internamiento'}</p><p><strong>Período:</strong> {d.fecha_inicio_programada||'—'} al {d.fecha_fin_programada||'—'}</p></div>:null})()}
            <button type="button" onClick={nuevaEncuesta} disabled={iniciando||!seleccion} style={{width:'100%',fontSize:'18px',padding:'16px'}}>{iniciando ? 'INICIANDO…' : 'NUEVA ENCUESTA'}</button>
          </>
        ) : <p role="alert">No tienes designaciones activas. El Administrador de Encuestas debe asignarte una o más unidades/hospitales y un período antes de iniciar.</p>}
        {error && <p role="alert" style={{marginTop:'18px'}}>{error}</p>}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
