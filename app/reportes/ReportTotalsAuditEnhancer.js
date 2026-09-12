'use client';

import {useEffect,useState} from 'react';
import {createClient} from '../../utils/supabase/client';

const norm=v=>String(v??'').trim().toUpperCase();
const key=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const same=(a,b)=>{const A=key(a),B=key(b);return !A||!B?A===B:A===B||A.includes(B)||B.includes(A)};
const isAmb=v=>norm(v).includes('AMBULATORIA');
const isHosp=v=>norm(v).includes('HOSPITALIZACION');
const first=(o,names)=>{for(const n of names){if(o?.[n]!==undefined&&o?.[n]!==null&&String(o[n]).trim()!=='')return o[n]}return''};

function readFilters(){
  const root=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Filtros')?.parentElement;
  const labels=root?[...root.querySelectorAll('label')]:[];
  const select=t=>labels.find(l=>l.textContent?.trim().startsWith(t))?.querySelector('select');
  const dates=root?[...root.querySelectorAll('input[type="date"]')]:[];
  return {tipo:select('Tipo')?.value||'',ecor:select('ECOR')?.value||'',municipio:select('Municipio')?.value||'',establecimiento:select('Establecimiento')?.value||'',desde:dates[0]?.value||'',hasta:dates[1]?.value||''};
}

function rowMeta(x){return{
  estado:first(x,['estado','status']),
  tipo:first(x,['tipo_encuesta','encuesta_codigo','tipo','codigo_encuesta']),
  ecor:first(x,['ecor','ecor_nombre']),
  municipio:first(x,['municipio','municipio_nombre']),
  establecimiento:first(x,['establecimiento_nombre','establecimiento','nombre_establecimiento']),
  fecha:first(x,['enviada_at','fecha_envio','finalizada_at','iniciada_at']),
  id:first(x,['sesion_id','id','session_id'])
}}

function applies(x,f){const m=rowMeta(x);if(norm(m.estado)&&norm(m.estado)!=='ENVIADA')return false;if(f.tipo&&!norm(m.tipo).includes(norm(f.tipo)))return false;if(f.ecor&&!same(m.ecor,f.ecor))return false;if(f.municipio&&!same(m.municipio,f.municipio))return false;if(f.establecimiento&&!same(m.establecimiento,f.establecimiento))return false;const fecha=String(m.fecha||'').slice(0,10);if(f.desde&&fecha&&fecha<f.desde)return false;if(f.hasta&&fecha&&fecha>f.hasta)return false;return true}

export default function ReportTotalsAuditEnhancer(){
  const[lista,setLista]=useState([]),[detalle,setDetalle]=useState([]),[filters,setFilters]=useState({tipo:'',ecor:'',municipio:'',establecimiento:'',desde:'',hasta:''});
  useEffect(()=>{let alive=true;(async()=>{const s=createClient();const[{data:l,error:le},{data:d,error:de}]=await Promise.all([s.rpc('listar_reportes_encuestas'),s.rpc('detalle_reportes_encuestas')]);if(!alive)return;if(!le)setLista(Array.isArray(l)?l:[]);if(!de)setDetalle(Array.isArray(d)?d:[])})();return()=>{alive=false}},[]);
  useEffect(()=>{let timer;const read=()=>setFilters(readFilters());const schedule=()=>{clearTimeout(timer);timer=setTimeout(read,100)};read();document.addEventListener('change',schedule,true);return()=>{clearTimeout(timer);document.removeEventListener('change',schedule,true)}},[]);

  useEffect(()=>{
    const heading=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');if(!heading)return;
    let box=document.querySelector('[data-totales-conciliados="1"]');if(!box){box=document.createElement('div');box.dataset.totalesConciliados='1';heading.parentNode.insertBefore(box,heading.nextSibling)}

    const detailRows=detalle.filter(x=>applies({...x,estado:'ENVIADA'},filters));
    const detailMap=new Map();detailRows.forEach(x=>{const id=String(x.sesion_id||'');if(id)detailMap.set(id,x)});
    const conDetalle=detailMap.size;

    const listRows=lista.filter(x=>applies(x,filters));
    const listMap=new Map();listRows.forEach((x,i)=>{const m=rowMeta(x);listMap.set(String(m.id||`row-${i}`),x)});
    const fuenteSesiones=listMap.size;

    const fuenteValida=fuenteSesiones>0||conDetalle===0;
    const total=fuenteValida?fuenteSesiones:conDetalle;
    const base=fuenteValida?[...listMap.values()]:[...detailMap.values()];
    const amb=base.filter(x=>isAmb(rowMeta(x).tipo||x.tipo_encuesta)).length;
    const hosp=base.filter(x=>isHosp(rowMeta(x).tipo||x.tipo_encuesta)).length;

    const cards=heading.nextElementSibling?.querySelectorAll(':scope > div')||[];for(const c of cards){if(c.textContent?.includes('Encuestas enviadas')){const n=[...c.querySelectorAll('div')].find(d=>/^\d+$/.test(d.textContent?.trim()||''));if(n)n.textContent=String(total);const small=c.querySelector('small');if(small)small.textContent=fuenteValida?'sesiones ENVIADAS válidas':'sesiones únicas con detalle de respuestas';break}}

    box.style.cssText=`margin:10px 0 16px;padding:14px;border:2px solid ${fuenteValida?'#17634e':'#b7791f'};border-radius:12px;background:${fuenteValida?'#f4faf7':'#fffaf0'}`;
    if(!fuenteValida&&conDetalle>0){
      box.innerHTML=`<div style="font-weight:900;font-size:16px;margin-bottom:8px">Control de totales</div><div style="font-size:28px;font-weight:900">${conDetalle}</div><small>Encuestas con detalle de respuestas dentro de los filtros actuales</small><div style="margin-top:10px;padding:9px 10px;border-radius:8px;background:#fff4df;color:#7a4800;font-weight:700">⚠️ La fuente de sesiones enviadas no coincidió correctamente con el filtro de establecimiento. Para evitar mostrar un total falso, se mantiene el total analítico comprobable (${conDetalle}) y NO se declara conciliado.</div>`;
      return;
    }

    const sinDetalle=Math.max(0,total-conDetalle);
    box.innerHTML=`<div style="font-weight:900;font-size:16px;margin-bottom:8px">Totales conciliados · fuente de sesiones enviadas</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"><div><div style="font-size:28px;font-weight:900">${total}</div><small>TOTAL VÁLIDAS</small></div><div><div style="font-size:28px;font-weight:900">${amb}</div><small>Ambulatorias</small></div><div><div style="font-size:28px;font-weight:900">${hosp}</div><small>Hospitalización</small></div><div><div style="font-size:28px;font-weight:900">${conDetalle}</div><small>Con detalle de respuestas</small></div></div>${sinDetalle>0?`<div style="margin-top:10px;padding:9px 10px;border-radius:8px;background:#fff4df;color:#7a4800;font-weight:700">⚠️ ${sinDetalle} encuesta(s) ENVIADA(S) no están apareciendo en el detalle de respuestas. Los porcentajes analíticos se calculan solo con ${conDetalle} encuestas con respuestas disponibles.</div>`:'<div style="margin-top:10px;color:#315e50;font-weight:700">✓ Total de sesiones y detalle de respuestas conciliados.</div>'}`;
  },[lista,detalle,filters]);
  return null;
}
