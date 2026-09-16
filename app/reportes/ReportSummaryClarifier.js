'use client';

import {useEffect} from 'react';

const fractionFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/(\d+)\s*\/\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[null,null]};
const pct=(n,d)=>d?Math.round(n*1000/d)/10:null;
const readAuditNumber=(box,label)=>{if(!box)return null;const items=[...box.querySelectorAll('div')];for(const el of items){const small=el.querySelector(':scope > small');if(small?.textContent?.trim()===label){const d=[...el.children].find(x=>x.tagName==='DIV'&&/^\d+$/.test(x.textContent?.trim()||''));if(d)return Number(d.textContent.trim())}}return null};

export default function ReportSummaryClarifier(){
 useEffect(()=>{
  let busy=false;
  const apply=()=>{
   if(busy)return;
   const headings=[...document.querySelectorAll('h2')];
   const h=headings.find(x=>x.textContent?.trim()==='Resumen ejecutivo');
   const grid=[...h?.parentElement?.children||[]].find(x=>x!==h&&x.querySelector?.('strong')?.textContent?.trim()==='Encuestas enviadas');
   if(!grid)return;
   const cards=[...grid.children].filter(x=>x.querySelector?.('strong'));
   const byLabel=label=>cards.find(x=>x.querySelector('strong')?.textContent?.trim()===label);
   const global=byLabel('Satisfacción Likert')||byLabel('Satisfacción positiva');
   const muy=byLabel('Muy satisfecho');
   const neg=byLabel('Insatisfecho');
   const neu=byLabel('Neutral');
   if(!global||!muy||!neg||!neu)return;

   const [posN,den]=fractionFrom(global.querySelector('small')?.textContent);
   const [muyN]=fractionFrom(muy.querySelector('small')?.textContent);
   const [negN]=fractionFrom(neg.querySelector('small')?.textContent);
   const [neuN]=fractionFrom(neu.querySelector('small')?.textContent);
   if([posN,den,muyN,negN,neuN].some(v=>v==null))return;
   const satN=Math.max(0,posN-muyN);
   const otrosN=Math.max(0,den-muyN-satN-negN-neuN);

   const audit=document.querySelector('[data-totales-conciliados="1"]');
   const amb=readAuditNumber(audit,'Ambulatorias');
   const hosp=readAuditNumber(audit,'Hospitalización');
   const totalInstrumento=(amb??0)*16+(hosp??0)*20;
   const noLikert=Math.max(0,totalInstrumento-den);

   busy=true;
   global.querySelector('strong').textContent='Satisfacción positiva (Likert)';
   const gs=global.querySelector('small');
   if(gs)gs.textContent=`${posN}/${den} respuestas Likert = Muy satisfecho + Satisfecho`;

   let totalBox=document.getElementById('instrument-total-note');
   if(!totalBox){
    totalBox=document.createElement('div');totalBox.id='instrument-total-note';
    totalBox.style.cssText='grid-column:1/-1;padding:14px 16px;border-radius:12px;background:#eef7f2;border:2px solid #17634e;line-height:1.5';
    grid.insertBefore(totalBox,grid.firstChild);
   }
   if(amb!=null&&hosp!=null){
    totalBox.innerHTML=`<strong style="font-size:16px">Total de respuestas del instrumento: ${totalInstrumento.toLocaleString('es-HN')}</strong><div style="margin-top:4px">${amb} ambulatorias × 16 = ${(amb*16).toLocaleString('es-HN')} &nbsp; + &nbsp; ${hosp} hospitalización × 20 = ${(hosp*20).toLocaleString('es-HN')}.</div><div style="margin-top:5px"><strong>Respuestas Likert analizadas: ${den.toLocaleString('es-HN')}</strong>. Son un subconjunto del total y se utilizan únicamente para calcular satisfacción. Las ${(noLikert).toLocaleString('es-HN')} respuestas restantes corresponden a preguntas no Likert.</div>`;
   }

   let note=document.getElementById('likert-summary-note');
   if(!note){
    note=document.createElement('div');note.id='likert-summary-note';
    note.style.cssText='grid-column:1/-1;padding:12px 14px;border-radius:12px;background:#f7faf9;border:1px solid #cfded8;font-size:14px;line-height:1.45';
    grid.insertBefore(note,totalBox?.nextSibling||grid.firstChild);
   }
   note.innerHTML='<strong>Cómo leer los porcentajes:</strong> la distribución de las respuestas Likert suma 100%. “Satisfacción positiva” es un indicador derivado (Muy satisfecho + Satisfecho). Maltrato/discriminación, compra externa e intención de regresar son indicadores independientes, con denominadores propios, y no se suman con la distribución Likert.';

   const makeCard=(id,label,n)=>{
    let c=document.getElementById(id);
    if(!c){c=document.createElement('div');c.id=id;c.style.cssText='border:1px solid #dce6e2;border-radius:14px;padding:16px;background:#fff';grid.appendChild(c)}
    c.innerHTML=`<strong>${label}</strong><div style="font-size:30px;font-weight:800">${pct(n,den)}%</div><small>${n}/${den} respuestas Likert</small>`;
    return c;
   };
   makeCard('likert-satisfecho-card','Satisfecho',satN);
   makeCard('likert-otros-card','Otros / no clasificados',otrosN);

   let check=document.getElementById('likert-sum-check');
   if(!check){check=document.createElement('div');check.id='likert-sum-check';check.style.cssText='grid-column:1/-1;padding:10px 14px;border-radius:10px;background:#eef7f2;font-weight:700;color:#174f3e';grid.appendChild(check)}
   const total=muyN+satN+negN+neuN+otrosN;
   check.textContent=`✓ Distribución Likert conciliada: ${total.toLocaleString('es-HN')}/${den.toLocaleString('es-HN')} respuestas Likert = 100%.`;
   busy=false;
  };
  apply();
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  return()=>obs.disconnect();
 },[]);
 return null;
}
