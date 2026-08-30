'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const CURSO_KEY='encuestas_olancho_sesion_en_curso';

export default function EncuestadorPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [designaciones, setDesignaciones] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [iniciando, setIniciando] = useState(false);
  const [mostrarConsentimiento, setMostrarConsentimiento] = useState(false);
  const [encuestaEnCurso,setEncuestaEnCurso]=useState(null);

  useEffect(() => {
    try{const raw=localStorage.getItem(CURSO_KEY);if(raw)setEncuestaEnCurso(JSON.parse(raw));}catch{}
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: perfilData, error: perfilError } = await supabase.rpc('obtener_mi_perfil');
      const p = Array.isArray(perfilData) ? perfilData[0] : null;
      if (perfilError || !p) { if (active) setError('No fue posible identificar el perfil del usuario.'); setLoading(false); return; }
      if (!['ENCUESTADOR','JEFE_ENCUESTADORES','ADMIN_ENCUESTAS'].includes(p.rol)) { router.replace('/panel'); return; }
      const { data: asigData, error: asigError } = await supabase.rpc('obtener_mis_designaciones_encuestador_v2');
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

  function continuarEncuesta(){if(encuestaEnCurso?.url)router.push(encuestaEnCurso.url)}
  function solicitarConsentimiento(){if(encuestaEnCurso){setError('Ya existe una encuesta en curso. Debe continuarla y finalizarla antes de iniciar otra.');return}if(!seleccion){setError('Seleccione la designación con la que realizará la encuesta.');return}setError('');setMensaje('');setMostrarConsentimiento(true)}
  function noAceptaParticipar(){setMostrarConsentimiento(false);setError('');setMensaje('La persona no aceptó participar. No se creó ninguna encuesta ni se contabilizó respuesta.')}
  async function aceptaParticipar(){if(encuestaEnCurso){setMostrarConsentimiento(false);setError('Ya existe una encuesta en curso. Continúela antes de iniciar otra.');return}if(!seleccion){setError('Seleccione la designación con la que realizará la encuesta.');setMostrarConsentimiento(false);return}setError('');setMensaje('');setIniciando(true);const supabase=createClient();const{data,error:rpcError}=await supabase.rpc('iniciar_encuesta_asignada',{p_designacion_id:Number(seleccion)});const sesion=Array.isArray(data)?data[0]:null;if(rpcError||!sesion){setError(rpcError?.message||'No fue posible iniciar la encuesta.');setIniciando(false);return}const url=`/encuestas/${sesion.encuesta_codigo}?sesion=${sesion.sesion_id}&folio=${encodeURIComponent(sesion.folio)}&modo=aplicacion`;try{localStorage.setItem(CURSO_KEY,JSON.stringify({url,sesion_id:sesion.sesion_id,folio:sesion.folio,codigo:sesion.encuesta_codigo}))}catch{}router.push(url)}

  if (loading) return <main className="shell"><section className="loginCard"><p>Preparando módulo del encuestador…</p></section></main>;

  return <main className="shell"><section className="loginCard" style={{maxWidth:'760px'}}>
    <div className="badge">ENCUESTAS · OLANCHO</div><h1>Aplicar encuestas</h1>
    {perfil?.nombre && <p><strong>Nombre:</strong> {perfil.nombre}</p>}
    {perfil?.rol==='ADMIN_ENCUESTAS'&&<p><strong>Perfil acumulable:</strong> Administrador de Encuestas · Jefe de Encuestadores · Encuestador.</p>}
    {encuestaEnCurso&&<div style={{border:'2px solid #17634e',borderRadius:14,padding:20,margin:'18px 0',background:'#f7faf9'}}><h2 style={{marginTop:0}}>Encuesta en curso</h2><p>Hay una encuesta que todavía no ha sido finalizada. Continúe la misma encuesta; no se creará una nueva.</p>{encuestaEnCurso.folio&&<p><strong>Folio:</strong> {encuestaEnCurso.folio}</p>}<button type="button" onClick={continuarEncuesta} style={{width:'100%',padding:16,fontSize:18}}>CONTINUAR ENCUESTA</button></div>}
    {designaciones.length > 0 ? <>
      <label style={{display:'block',fontWeight:700,margin:'18px 0 8px'}}>Designación para esta encuesta</label>
      <select value={seleccion} disabled={!!encuestaEnCurso} onChange={e=>{setSeleccion(e.target.value);setMostrarConsentimiento(false);setMensaje('');setError('')}} style={{width:'100%',padding:'12px'}}><option value="">Seleccione designación</option>{designaciones.map(d => <option key={d.id} value={d.id}>{d.establecimiento_nombre} · {d.tipo_encuesta==='AMBULATORIA'?'Atención Ambulatoria':'Hospitalización / Internamiento'} · {d.realizadas||0} de {d.meta_encuestas||'—'}</option>)}</select>
      {seleccion&&(()=>{const d=designaciones.find(x=>String(x.id)===seleccion);return d?<div style={{border:'1px solid #dce6e2',borderRadius:14,padding:18,margin:'20px 0'}}><p><strong>ID:</strong> {d.encuestador_id}</p><p><strong>Establecimiento:</strong> {d.establecimiento_nombre}</p><p><strong>Tipo:</strong> {d.tipo_encuesta==='AMBULATORIA'?'Atención Ambulatoria':'Hospitalización / Internamiento'}</p><p><strong>Inicio:</strong> {d.fecha_inicio_programada||'—'}</p><p><strong>Meta asignada:</strong> {d.meta_encuestas||'—'} encuestas</p><p><strong>Realizadas:</strong> {d.realizadas||0}</p><p><strong>Pendientes:</strong> {d.meta_encuestas?Math.max(0,d.meta_encuestas-(d.realizadas||0)):'—'}</p></div>:null})()}
      {!mostrarConsentimiento?<button type="button" onClick={solicitarConsentimiento} disabled={!seleccion||!!encuestaEnCurso} style={{width:'100%',fontSize:18,padding:16}}>NUEVA ENCUESTA</button>:<div role="dialog" aria-labelledby="titulo-consentimiento" style={{border:'2px solid #17634e',borderRadius:14,padding:20,marginTop:18,background:'#f7faf9'}}><h2 id="titulo-consentimiento" style={{marginTop:0}}>Aviso de anonimato y participación voluntaria</h2><p style={{fontWeight:800}}>El encuestador debe leer textualmente lo siguiente antes de iniciar:</p><div style={{background:'#fff',border:'1px solid #dce6e2',borderRadius:12,padding:16,fontSize:17,lineHeight:1.55}}>“Esta encuesta es anónima. Sus respuestas no incluirán su nombre, número de identidad ni información que permita identificarle. Su participación es voluntaria. Puede decidir no participar y esto no afectará de ninguna manera la atención que recibe. Sus respuestas serán utilizadas únicamente para evaluar y mejorar la calidad de la atención.”</div><p style={{fontWeight:800,marginTop:18}}>Después de leer el aviso, pregunte: ¿Acepta participar en la encuesta?</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}><button type="button" onClick={aceptaParticipar} disabled={iniciando} style={{padding:14}}>{iniciando?'INICIANDO…':'SÍ, ACEPTA PARTICIPAR'}</button><button type="button" onClick={noAceptaParticipar} disabled={iniciando} style={{padding:14,background:'#fff',color:'#173d33',border:'2px solid #17634e'}}>NO ACEPTA PARTICIPAR</button></div><p style={{fontSize:13,color:'#647a74',marginBottom:0}}>La sesión se crea únicamente después de seleccionar “Sí, acepta participar”.</p></div>}
    </>:<p role="alert">No tiene designaciones activas. El Administrador de Encuestas o el Jefe de Encuestadores debe asignarle establecimiento, tipo de encuesta, fecha de inicio y número total de encuestas.</p>}
    {mensaje&&<p role="status" style={{marginTop:18}}><strong>{mensaje}</strong></p>}{error&&<p role="alert" style={{marginTop:18}}>{error}</p>}<a className="back" href="/panel">← Volver al panel</a>
  </section></main>;
}
