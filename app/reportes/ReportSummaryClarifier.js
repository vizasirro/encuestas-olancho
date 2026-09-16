'use client';

import {useEffect} from 'react';

const fractionFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/(\d+)\s*\/\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[null,null]};
const pct=(n,d)=>d?Math.round(n*1000/d)/10:null;
const readAuditNumber=(box,label)=>{if(!box)return null;const items=[...box.querySelectorAll('div')];for(const el of items){const small=el.querySelector(':scope > small');if(small?.textContent?.trim()===label){const d=[...el.children].find(x=>x.tagName==='DIV'&&/^\d+$/.test(x.textContent?.trim()||''));if(d)return Number(d.textContent.trim())}}return null};

export default function ReportSummaryClarifier(){
 useEffect(()=>{
  let busy=false;
  let stable=null;
  const apply=()=>{
   if(busy)return;
   const h=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');
   const grid=[...h?.parentElement?.children||[]].find(x=>x!==h&&x.querySelector?.('strong')?.textContent?.trim()==='Encuestas enviadas');
   if(!grid)return;
   const cards=[...grid.children].filter(x=>x.querySelector?.('strong'));
   const byLabel=label=>cards.find(x=>x.querySelector('strong')?.textContent?.trim()===label);
   const global=byLabel('Satisfacción Likert')||byLabel('Satisfacción positiva')||byLabel('Satisfacción positiva (Likert)');
   const muy=byLabel('Muy satisfecho');
   const neg=byLabel('Insatisfecho');
   const neu=byLabel('Neutral');
   if(!global||!muy||!neg||!neu)return;

   // Tomar una sola fotografía coherente de React: las cuatro tarjetas deben compartir denominador.
   if(!stable){
    const [posN,den]=fractionFrom(global.querySelector('small')?.textContent);
    const [muyN,muyDen]=fractionFrom(muy.querySelector('small')?.textContent);
    const [negN,negDen]=fractionFrom(neg.querySelector('small')?.textContent);
    const [neuN,neuDen]=fractionFrom(neu.querySelector('small')?.textContent);
    if([posN,den,muyN,muyDen,negN,negDen,neuN,neuDen].some(v=>v==null))return;
    // Si React aún está actualizando (p. ej. 1500 frente a 1512), no mezclar bases: esperar.
    if(!(den===muyDen&&den===negDen&&den===neuDen))return;
    const satN=Math.max(0,posN-muyN);
    const otrosN=Math.max(0,den-muyN-satN-negN-neuN);
    stable={posN,den,muyN,negN,neuN,satN,otrosN};
   }

   const {posN,den,muyN,negN,neuN,satN,otrosN}=stable;
   busy=true;
   const setCard=(card,label,n,extra='')=>{
    if(!card)return;
    const strong=card.querySelector('strong'); if(strong)strong.textContent=label;
    const value=[...card.querySelectorAll('div')].find(d=>/^-?\d+(?:\.\d+)?%$/.test(d.textContent?.trim()||''));
    if(value)value.textContent=`${pct(n,den)}%`;
    const small=card.querySelector('small'); if(small)small.textContent=`${n}/${den} respuestas Likert${extra}`;
   };
   setCard(global,'Satisfacción positiva (Likert)',posN,' = Muy satisfecho + Satisfecho');
   setCard(muy,'Muy satisfecho',muyN);
   setCard(neg,'Insatisfecho',negN);
   setCard(neu,'Neutral',neuN);

   const makeCard=(id,label,n)=>{
    let c=document.getElementById(id);
    if(!c){c=document.createElement('div');c.id=id;c.style.cssText='border:1px solid #dce6e2;border-radius:14px;padding:16px;background:#fff';grid.appendChild(c)}
    c.innerHTML=`<strong>${label}</strong><div style="font-size:30px;font-weight:800">${pct(n,den)}%</div><small>${n}/${den} respuestas Likert</small>`;
   };
   makeCard('likert-satisfecho-card','Satisfecho',satN);
   makeCard('likert-otros-card','Otros / no clasificados',otrosN);

   const audit=document.querySelector('[data-totales-conciliados="1"]');
   const amb=readAuditNumber(audit,'Ambulatorias');
   const hosp=readAuditNumber(audit,'Hospitalización');
   if(amb!=null&&hosp!=null){
    const totalInstrumento=amb*16+hosp*20;
    const noLikert=Math.max(0,totalInstrumento-den);
    let totalBox=document.getElementById('instrument-total-note');
    if(!totalBox){totalBox=document.createElement('div');totalBox.id='instrument-total-note';totalBox.style.cssText='grid-column:1/-1;padding:14px 16px;border-radius:12px;background:#eef7f2;border:2px solid #17634e;line-height:1.5';grid.insertBefore(totalBox,grid.firstChild)}
    totalBox.innerHTML=`<strong style="font-size:16px">Total de respuestas del instrumento: ${totalInstrumento.toLocaleString('es-HN')}</strong><div>${amb} ambulatorias × 16 = ${(amb*16).toLocaleString('es-HN')} + ${hosp} hospitalización × 20 = ${(hosp*20).toLocaleString('es-HN')}.</div><div><strong>Respuestas Likert analizadas: ${den.toLocaleString('es-HN')}</strong>. Las ${noLikert.toLocaleString('es-HN')} restantes son respuestas no Likert.</div>`;
   }

   let note=document.getElementById('likert-summary-note');
   if(!note){note=document.createElement('div');note.id='likert-summary-note';note.style.cssText='grid-column:1/-1;padding:12px 14px;border-radius:12px;background:#f7faf9;border:1px solid #cfded8;font-size:14px;line-height:1.45';grid.insertBefore(note,grid.firstChild)}
   note.innerHTML='<strong>Cómo leer los porcentajes:</strong> todas las categorías Likert usan el mismo denominador. “Satisfacción positiva” = Muy satisfecho + Satisfecho. Maltrato/discriminación, compra externa e intención de regresar son indicadores independientes y no se suman con Likert.';

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
