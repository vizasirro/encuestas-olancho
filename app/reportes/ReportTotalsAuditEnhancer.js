'use client';

import {useEffect,useState} from 'react';
import {createClient} from '../../utils/supabase/client';

function norm(v){return String(v||'').trim().toUpperCase()}
function isAmb(v){return norm(v).includes('AMBULATORIA')}
function isHosp(v){return norm(v).includes('HOSPITALIZACION')}

export default function ReportTotalsAuditEnhancer(){
  const[data,setData]=useState([]);
  const[filters,setFilters]=useState({tipo:'',establecimiento:''});

  useEffect(()=>{let alive=true;(async()=>{const s=createClient();const{data,error}=await s.rpc('detalle_reportes_encuestas');if(alive&&!error)setData(Array.isArray(data)?data:[])})();return()=>{alive=false}},[]);

  useEffect(()=>{
    let timer=null;
    const read=()=>{
      const labels=[...document.querySelectorAll('label')];
      const byText=t=>labels.find(l=>l.childNodes?.[0]?.textContent?.trim()===t)?.querySelector('select');
      const tipo=byText('Tipo')?.value||'';
      const establecimiento=byText('Establecimiento')?.value||'';
      setFilters(f=>f.tipo===tipo&&f.establecimiento===establecimiento?f:{tipo,establecimiento});
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(read,80)};
    read();
    document.addEventListener('change',schedule,true);
    return()=>{clearTimeout(timer);document.removeEventListener('change',schedule,true)};
  },[]);

  useEffect(()=>{
    const heading=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');
    if(!heading)return;
    let box=document.querySelector('[data-totales-conciliados="1"]');
    if(!box){box=document.createElement('div');box.dataset.totalesConciliados='1';heading.parentNode.insertBefore(box,heading.nextSibling)}

    const filtered=data.filter(x=>(!filters.establecimiento||x.establecimiento_nombre===filters.establecimiento)&&(!filters.tipo||norm(x.tipo_encuesta)===norm(filters.tipo)||norm(x.tipo_encuesta).includes(norm(filters.tipo))));
    const sessions=new Map();filtered.forEach(x=>{if(x?.sesion_id)sessions.set(String(x.sesion_id),x)});
    const all=[...sessions.values()];
    const amb=all.filter(x=>isAmb(x.tipo_encuesta)).length;
    const hosp=all.filter(x=>isHosp(x.tipo_encuesta)).length;
    const otros=all.length-amb-hosp;

    box.style.cssText='margin:10px 0 16px;padding:14px;border:2px solid #17634e;border-radius:12px;background:#f4faf7';
    box.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:8px">Totales conciliados · encuestas enviadas válidas</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"><div><div style="font-size:28px;font-weight:900">${all.length}</div><small>TOTAL</small></div><div><div style="font-size:28px;font-weight:900">${amb}</div><small>Ambulatorias</small></div><div><div style="font-size:28px;font-weight:900">${hosp}</div><small>Hospitalización</small></div>${otros?`<div><div style="font-size:28px;font-weight:900">${otros}</div><small>Otros tipos</small></div>`:''}</div><div style="margin-top:8px;font-size:12px;color:#526862">Conteo por sesión única. Las encuestas canceladas no forman parte de este total.</div>`;
  },[data,filters]);

  return null;
}
