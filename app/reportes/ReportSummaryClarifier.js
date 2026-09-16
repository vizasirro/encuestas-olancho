'use client';

import {useEffect} from 'react';

const numberFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/([0-9]+(?:\.[0-9]+)?)/);return m?Number(m[1]):null};
const fractionFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/(\d+)\s*\/\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[null,null]};
const pct=(n,d)=>d?Math.round(n*1000/d)/10:null;

export default function ReportSummaryClarifier(){
 useEffect(()=>{
  let busy=false;
  const apply=()=>{
   if(busy)return;
   const headings=[...document.querySelectorAll('h2')];
   const h=headings.find(x=>x.textContent?.trim()==='Resumen ejecutivo');
   const grid=h?.nextElementSibling;
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

   busy=true;
   global.querySelector('strong').textContent='Satisfacción positiva';
   const gs=global.querySelector('small');
   if(gs)gs.textContent=`${posN}/${den} = Muy satisfecho + Satisfecho (indicador derivado)`;

   let note=document.getElementById('likert-summary-note');
   if(!note){
    note=document.createElement('div'); note.id='likert-summary-note';
    note.style.cssText='grid-column:1/-1;padding:12px 14px;border-radius:12px;background:#f3f8f6;border:1px solid #cfded8;font-size:14px;line-height:1.45';
    grid.insertBefore(note,grid.firstChild);
   }
   note.innerHTML='<strong>Cómo leer estos porcentajes:</strong> la distribución Likert sí suma 100%. La satisfacción positiva es un indicador derivado (Muy satisfecho + Satisfecho). Maltrato/discriminación, compra externa e intención de regresar son indicadores independientes y no se suman con la distribución.';

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
   check.textContent=`✓ Distribución Likert conciliada: ${total}/${den} respuestas = 100%.`;
   busy=false;
  };
  apply();
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  return()=>obs.disconnect();
 },[]);
 return null;
}
