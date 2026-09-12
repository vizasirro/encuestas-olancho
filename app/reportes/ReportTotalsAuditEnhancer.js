'use client';

import {useEffect,useState} from 'react';
import {createClient} from '../../utils/supabase/client';

const norm=v=>String(v||'').trim().toUpperCase();
const isAmb=v=>norm(v).includes('AMBULATORIA');
const isHosp=v=>norm(v).includes('HOSPITALIZACION');

function readFilters(){
  const labels=[...document.querySelectorAll('label')];
  const select=t=>labels.find(l=>l.childNodes?.[0]?.textContent?.trim()===t)?.querySelector('select');
  const dateInputs=[...document.querySelectorAll('input[type="date"]')];
  return {
    tipo:select('Tipo')?.value||'',
    ecor:select('ECOR')?.value||'',
    municipio:select('Municipio')?.value||'',
    establecimiento:select('Establecimiento')?.value||'',
    desde:dateInputs[0]?.value||'',
    hasta:dateInputs[1]?.value||''
  };
}

function applies(x,f){
  if(norm(x.estado)!=='ENVIADA')return false;
  if(f.tipo&&!norm(x.tipo_encuesta).includes(norm(f.tipo)))return false;
  if(f.ecor&&x.ecor!==f.ecor)return false;
  if(f.municipio&&x.municipio!==f.municipio)return false;
  if(f.establecimiento&&x.establecimiento_nombre!==f.establecimiento)return false;
  const fecha=String(x.enviada_at||x.iniciada_at||'').slice(0,10);
  if(f.desde&&fecha<f.desde)return false;
  if(f.hasta&&fecha>f.hasta)return false;
  return true;
}

export default function ReportTotalsAuditEnhancer(){
  const[lista,setLista]=useState([]);
  const[detalle,setDetalle]=useState([]);
  const[filters,setFilters]=useState({tipo:'',ecor:'',municipio:'',establecimiento:'',desde:'',hasta:''});

  useEffect(()=>{let alive=true;(async()=>{
    const s=createClient();
    const[{data:l,error:le},{data:d,error:de}]=await Promise.all([
      s.rpc('listar_reportes_encuestas'),
      s.rpc('detalle_reportes_encuestas')
    ]);
    if(!alive)return;
    if(!le)setLista(Array.isArray(l)?l:[]);
    if(!de)setDetalle(Array.isArray(d)?d:[]);
  })();return()=>{alive=false}},[]);

  useEffect(()=>{
    let timer=null;
    const read=()=>setFilters(readFilters());
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(read,100)};
    read();
    document.addEventListener('change',schedule,true);
    return()=>{clearTimeout(timer);document.removeEventListener('change',schedule,true)};
  },[]);

  useEffect(()=>{
    const heading=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');
    if(!heading)return;
    let box=document.querySelector('[data-totales-conciliados="1"]');
    if(!box){box=document.createElement('div');box.dataset.totalesConciliados='1';heading.parentNode.insertBefore(box,heading.nextSibling)}

    const valid=lista.filter(x=>applies(x,filters));
    const total=valid.length;
    const amb=valid.filter(x=>isAmb(x.tipo_encuesta)).length;
    const hosp=valid.filter(x=>isHosp(x.tipo_encuesta)).length;
    const otros=total-amb-hosp;

    const detailIds=new Set(detalle.filter(x=>{
      if(filters.tipo&&!norm(x.tipo_encuesta).includes(norm(filters.tipo)))return false;
      if(filters.ecor&&x.ecor!==filters.ecor)return false;
      if(filters.municipio&&x.municipio!==filters.municipio)return false;
      if(filters.establecimiento&&x.establecimiento_nombre!==filters.establecimiento)return false;
      const fecha=String(x.enviada_at||'').slice(0,10);
      if(filters.desde&&fecha<filters.desde)return false;
      if(filters.hasta&&fecha>filters.hasta)return false;
      return true;
    }).map(x=>String(x.sesion_id)));
    const conDetalle=detailIds.size;
    const sinDetalle=Math.max(0,total-conDetalle);

    const cards=heading.nextElementSibling?.querySelectorAll(':scope > div')||[];
    for(const c of cards){
      if(c.textContent?.includes('Encuestas enviadas')){
        const n=[...c.querySelectorAll('div')].find(d=>/^\d+$/.test(d.textContent?.trim()||''));
        if(n)n.textContent=String(total);
        const small=c.querySelector('small');
        if(small)small.textContent='sesiones ENVIADAS válidas';
        break;
      }
    }

    box.style.cssText='margin:10px 0 16px;padding:14px;border:2px solid #17634e;border-radius:12px;background:#f4faf7';
    box.innerHTML=`<div style="font-weight:900;font-size:16px;margin-bottom:8px">Totales conciliados · fuente de sesiones enviadas</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"><div><div style="font-size:28px;font-weight:900">${total}</div><small>TOTAL VÁLIDAS</small></div><div><div style="font-size:28px;font-weight:900">${amb}</div><small>Ambulatorias</small></div><div><div style="font-size:28px;font-weight:900">${hosp}</div><small>Hospitalización</small></div>${otros?`<div><div style="font-size:28px;font-weight:900">${otros}</div><small>Otros tipos</small></div>`:''}<div><div style="font-size:28px;font-weight:900">${conDetalle}</div><small>Con detalle de respuestas</small></div></div><div style="margin-top:9px;font-size:12px;color:#526862">Conteo por sesión única ENVIADA. Las canceladas y las encuestas en curso no se incluyen.</div>${sinDetalle>0?`<div style="margin-top:10px;padding:9px 10px;border-radius:8px;background:#fff4df;color:#7a4800;font-weight:700">⚠️ ${sinDetalle} encuesta(s) válida(s) no están apareciendo todavía en el detalle de respuestas del reporte. El total mostrado arriba sí es el total real; los porcentajes analíticos se basan únicamente en las respuestas disponibles.</div>`:'<div style="margin-top:10px;color:#315e50;font-weight:700">✓ Total de sesiones y detalle de respuestas conciliados.</div>'}`;
  },[lista,detalle,filters]);

  return null;
}
