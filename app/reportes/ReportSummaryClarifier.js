'use client';

import {useEffect} from 'react';
const fractionFrom=s=>{const m=String(s||'').replace(/,/g,'').match(/(\d+)\s*\/\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[null,null]};
const pct=(n,d)=>d?Math.round(n*1000/d)/10:null;

export default function ReportSummaryClarifier(){
 useEffect(()=>{
  let busy=false,stable=null;
  const apply=()=>{
   if(busy)return;
   const h=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Resumen ejecutivo');
   const grid=[...h?.parentElement?.children||[]].find(x=>x!==h&&x.querySelector?.('strong')?.textContent?.trim()==='Encuestas enviadas');if(!grid)return;
   const cards=[...grid.children].filter(x=>x.querySelector?.('strong'));const byLabel=label=>cards.find(x=>x.querySelector('strong')?.textContent?.trim()===label);
   const global=byLabel('Satisfacción Likert')||byLabel('Satisfacción positiva')||byLabel('Satisfacción positiva (Likert)'),muy=byLabel('Muy satisfecho'),neg=byLabel('Insatisfecho'),neu=byLabel('Neutral');if(!global||!muy||!neg||!neu)return;
   if(!stable){const[posN,den]=fractionFrom(global.querySelector('small')?.textContent),[muyN,muyDen]=fractionFrom(muy.querySelector('small')?.textContent),[negN,negDen]=fractionFrom(neg.querySelector('small')?.textContent),[neuN,neuDen]=fractionFrom(neu.querySelector('small')?.textContent);if([posN,den,muyN,muyDen,negN,negDen,neuN,neuDen].some(v=>v==null))return;if(!(den===muyDen&&den===negDen&&den===neuDen))return;stable={posN,den,muyN,negN,neuN,satN:Math.max(0,posN-muyN),otrosN:Math.max(0,den-posN-negN-neuN)}}
   const{posN,den,muyN,negN,neuN,satN,otrosN}=stable;busy=true;
   const setCard=(card,label,n,extra='')=>{const strong=card?.querySelector('strong');if(strong)strong.textContent=label;const value=[...(card?.querySelectorAll('div')||[])].find(d=>/^-?\d+(?:\.\d+)?%$/.test(d.textContent?.trim()||''));if(value)value.textContent=`${pct(n,den)}%`;const small=card?.querySelector('small');if(small)small.textContent=`${n}/${den} respuestas Likert${extra}`};
   setCard(global,'Satisfacción positiva (Likert)',posN,' = Muy satisfecho + Satisfecho');setCard(muy,'Muy satisfecho',muyN);setCard(neg,'Insatisfecho',negN);setCard(neu,'Neutral',neuN);
   const makeCard=(id,label,n)=>{let c=document.getElementById(id);if(!c){c=document.createElement('div');c.id=id;c.style.cssText='border:1px solid #dce6e2;border-radius:14px;padding:16px;background:#fff';grid.appendChild(c)}c.innerHTML=`<strong>${label}</strong><div style="font-size:30px;font-weight:800">${pct(n,den)}%</div><small>${n}/${den} respuestas Likert</small>`};makeCard('likert-satisfecho-card','Satisfecho',satN);makeCard('likert-otros-card','Otros / no clasificados',otrosN);
   const audit=document.querySelector('[data-totales-conciliados="1"]');const totalReal=Number(audit?.dataset?.totalRespuestas||0),amb=Number(audit?.dataset?.ambulatorias||0),hosp=Number(audit?.dataset?.hospitalizacion||0);
   if(totalReal>0){const base=amb*16+hosp*20,modulo=Math.max(0,totalReal-base),noLikert=Math.max(0,totalReal-den);let totalBox=document.getElementById('instrument-total-note');if(!totalBox){totalBox=document.createElement('div');totalBox.id='instrument-total-note';totalBox.style.cssText='grid-column:1/-1;padding:14px 16px;border-radius:12px;background:#eef7f2;border:2px solid #17634e;line-height:1.5';grid.insertBefore(totalBox,grid.firstChild)}totalBox.innerHTML=`<strong style="font-size:16px">Total de respuestas guardadas: ${totalReal.toLocaleString('es-HN')}</strong><div>Instrumento base: ${amb} ambulatorias × 16 + ${hosp} hospitalización × 20 = ${base.toLocaleString('es-HN')}${modulo?`; módulo(s) adicional(es): +${modulo.toLocaleString('es-HN')}`:''}.</div><div><strong>Respuestas Likert: ${den.toLocaleString('es-HN')}</strong>. Respuestas no Likert: ${noLikert.toLocaleString('es-HN')}.</div>`}
   let note=document.getElementById('likert-summary-note');if(!note){note=document.createElement('div');note.id='likert-summary-note';note.style.cssText='grid-column:1/-1;padding:12px 14px;border-radius:12px;background:#f7faf9;border:1px solid #cfded8;font-size:14px;line-height:1.45';grid.insertBefore(note,grid.firstChild)}note.innerHTML='<strong>Cómo leer los porcentajes:</strong> todas las categorías Likert usan el mismo denominador. “Satisfacción positiva” = Muy satisfecho + Satisfecho. Maltrato/discriminación, compra externa e intención de regresar son indicadores independientes.';
   let check=document.getElementById('likert-sum-check');if(!check){check=document.createElement('div');check.id='likert-sum-check';check.style.cssText='grid-column:1/-1;padding:10px 14px;border-radius:10px;background:#eef7f2;font-weight:700;color:#174f3e';grid.appendChild(check)}const total=muyN+satN+negN+neuN+otrosN;check.textContent=`✓ Distribución Likert conciliada: ${total.toLocaleString('es-HN')}/${den.toLocaleString('es-HN')} = 100%.`;busy=false;
  };
  apply();const obs=new MutationObserver(()=>requestAnimationFrame(apply));obs.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>obs.disconnect();
 },[]);return null;
}
