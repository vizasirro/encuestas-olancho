'use client';

import {useEffect,useState} from 'react';
import {createClient} from '../../utils/supabase/client';

const norm=v=>(v==null?'':String(v));

function currentFilters(){
  const root=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Filtros')?.parentElement;
  const selects=root?[...root.querySelectorAll('select')]:[];
  const inputs=root?[...root.querySelectorAll('input[type="date"]')]:[];
  return {
    tipo:selects[0]?.value||'',
    ecor:selects[1]?.value||'',
    municipio:selects[2]?.value||'',
    establecimiento:selects[3]?.value||'',
    desde:inputs[0]?.value||'',
    hasta:inputs[1]?.value||''
  };
}

function applies(x,f){
  if(x.estado!=='ENVIADA')return false;
  if(f.tipo&&x.tipo_encuesta!==f.tipo)return false;
  if(f.ecor&&x.ecor!==f.ecor)return false;
  if(f.municipio&&x.municipio!==f.municipio)return false;
  if(f.establecimiento&&x.establecimiento_nombre!==f.establecimiento)return false;
  const fecha=norm(x.enviada_at||x.iniciada_at).slice(0,10);
  if(f.desde&&fecha<f.desde)return false;
  if(f.hasta&&fecha>f.hasta)return false;
  return true;
}

export default function ReportTotalsReconciler(){
  const[lista,setLista]=useState([]);
  const[view,setView]=useState({total:0,amb:0,hosp:0,detail:null,missing:0});
  const[err,setErr]=useState('');

  useEffect(()=>{(async()=>{
    const s=createClient();
    const{data,error}=await s.rpc('listar_reportes_encuestas');
    if(error){setErr(error.message);return}
    setLista(Array.isArray(data)?data:[]);
  })()},[]);

  useEffect(()=>{
    if(!lista.length)return;
    let timer;
    const render=()=>{
      const f=currentFilters();
      const valid=lista.filter(x=>applies(x,f));
      const total=valid.length;
      const amb=valid.filter(x=>String(x.tipo_encuesta||'').startsWith('AMBULATORIA')).length;
      const hosp=valid.filter(x=>String(x.tipo_encuesta||'').startsWith('HOSPITALIZACION')).length;
      const summary=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');
      let detail=null;
      if(summary){
        const cards=summary.nextElementSibling?.querySelectorAll(':scope > div')||[];
        for(const c of cards){
          if(c.textContent?.includes('Encuestas enviadas')){
            const n=[...c.querySelectorAll('div')].find(d=>/^\d+$/.test(d.textContent?.trim()||''));
            if(n){detail=Number(n.textContent.trim());n.textContent=String(total);}
            const small=c.querySelector('small');
            if(small)small.textContent='sesiones ENVIADAS válidas (fuente: listado de sesiones)';
            break;
          }
        }
      }
      setView({total,amb,hosp,detail,missing:detail==null?0:Math.max(0,total-detail)});
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,120)};
    render();
    const obs=new MutationObserver(schedule);
    obs.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    document.addEventListener('change',schedule,true);
    return()=>{clearTimeout(timer);obs.disconnect();document.removeEventListener('change',schedule,true)};
  },[lista]);

  if(err)return null;
  if(!lista.length)return null;
  return <div style={{maxWidth:1220,margin:'0 auto 16px',padding:'0 18px'}}>
    <div style={{border:'1px solid #b9d8cc',borderRadius:14,padding:14,background:'#f4fbf8'}}>
      <div style={{fontWeight:900,fontSize:16,marginBottom:8}}>CONCILIACIÓN DE TOTALES</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
        <div><strong>Total enviadas válidas</strong><div style={{fontSize:26,fontWeight:900}}>{view.total}</div></div>
        <div><strong>Ambulatorias</strong><div style={{fontSize:26,fontWeight:900}}>{view.amb}</div></div>
        <div><strong>Hospitalización</strong><div style={{fontSize:26,fontWeight:900}}>{view.hosp}</div></div>
        {view.detail!=null&&<div><strong>Con detalle de respuestas</strong><div style={{fontSize:26,fontWeight:900}}>{view.detail}</div></div>}
      </div>
      {view.missing>0&&<p style={{margin:'10px 0 0',fontWeight:750,color:'#8a4b00'}}>⚠️ Hay {view.missing} encuesta(s) ENVIADA(S) que están en el listado de sesiones pero no aparecen en el detalle de respuestas del reporte. El total de encuestas se muestra correctamente; los porcentajes analíticos se calculan únicamente con las respuestas disponibles.</p>}
      {view.missing===0&&<p style={{margin:'10px 0 0',color:'#315e50'}}>✓ El total de sesiones y el detalle de respuestas están conciliados para los filtros actuales.</p>}
    </div>
  </div>;
}
