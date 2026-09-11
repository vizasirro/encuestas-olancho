'use client';

import {useEffect} from 'react';

const COLORS=['#17634e','#2f8068','#63a68f','#9bc8b8','#d6e9e2','#f2b705','#c58d00','#8a6500'];

export default function CruceLibreChartEnhancer(){
  useEffect(()=>{
    let timer=null;
    const render=()=>{
      const heading=[...document.querySelectorAll('h2')].find(x=>x.textContent?.trim()==='Cruce libre entre dos preguntas');
      if(!heading)return;
      const card=heading.nextElementSibling;
      const table=card?.querySelector('table');
      const old=card?.querySelector('[data-cruce-chart="1"]');
      if(!table){old?.remove();return}
      const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());
      const series=headers.slice(1,-1);
      const rows=[...table.querySelectorAll('tbody tr')].map(tr=>{
        const cells=[...tr.querySelectorAll('td')];
        return {label:cells[0]?.textContent.trim()||'Sin dato',values:cells.slice(1,-1).map(td=>Number((td.textContent.match(/^\s*(\d+)/)||[])[1]||0))};
      });
      if(!series.length||!rows.length){old?.remove();return}
      const signature=JSON.stringify({series,rows});
      if(old?.dataset.signature===signature)return;
      old?.remove();
      const wrap=document.createElement('div');
      wrap.dataset.cruceChart='1';wrap.dataset.signature=signature;
      wrap.style.cssText='margin-top:20px;border-top:1px solid #dce6e2;padding-top:18px';
      const title=document.createElement('h3');title.textContent='Gráfico del cruce';title.style.margin='0 0 6px';wrap.appendChild(title);
      const note=document.createElement('p');note.textContent='Distribución porcentual de la Variable B dentro de cada categoría de la Variable A.';note.style.cssText='font-size:13px;color:#647a74;margin:0 0 14px';wrap.appendChild(note);
      const legend=document.createElement('div');legend.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px';
      series.forEach((s,i)=>{const item=document.createElement('span');item.style.cssText='display:inline-flex;align-items:center;gap:5px;font-size:12px';const sw=document.createElement('i');sw.style.cssText=`width:12px;height:12px;border-radius:3px;background:${COLORS[i%COLORS.length]};display:inline-block`;item.append(sw,document.createTextNode(s));legend.appendChild(item)});wrap.appendChild(legend);
      rows.forEach(r=>{const total=r.values.reduce((a,b)=>a+b,0);const row=document.createElement('div');row.style.margin='12px 0';const lab=document.createElement('div');lab.textContent=`${r.label} · n=${total}`;lab.style.cssText='font-weight:700;font-size:13px;margin-bottom:5px';row.appendChild(lab);const bar=document.createElement('div');bar.style.cssText='display:flex;width:100%;height:34px;border-radius:7px;overflow:hidden;background:#edf3f1;border:1px solid #dce6e2';r.values.forEach((v,i)=>{if(!v||!total)return;const seg=document.createElement('div');const p=100*v/total;seg.style.cssText=`width:${p}%;background:${COLORS[i%COLORS.length]};display:flex;align-items:center;justify-content:center;min-width:${p>=5?'24px':'0'};font-size:11px;font-weight:800;color:${i===4||i===5?'#173d33':'#fff'};overflow:hidden;white-space:nowrap`;seg.title=`${series[i]}: ${v} (${Math.round(p*10)/10}%)`;if(p>=9)seg.textContent=`${Math.round(p)}%`;bar.appendChild(seg)});row.appendChild(bar);wrap.appendChild(row)});
      card.appendChild(wrap);
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
    render();
    const obs=new MutationObserver(schedule);obs.observe(document.body,{subtree:true,childList:true,characterData:true});
    return()=>{clearTimeout(timer);obs.disconnect()}
  },[]);
  return null;
}
