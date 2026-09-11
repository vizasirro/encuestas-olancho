'use client';

import {useEffect} from 'react';

const COLORS=['#17634e','#2563eb','#f2b705','#dc4c4c','#7c3aed','#0891b2','#ea7c17','#64748b'];
const TEXT_COLORS=['#fff','#fff','#173d33','#fff','#fff','#fff','#fff','#fff'];

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
      const selects=card?.querySelectorAll('select');
      const varAText=selects?.[0]?.selectedOptions?.[0]?.textContent?.trim()||'Variable A';
      const varBText=selects?.[1]?.selectedOptions?.[0]?.textContent?.trim()||'Variable B';
      const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());
      const series=headers.slice(1,-1);
      const rows=[...table.querySelectorAll('tbody tr')].map(tr=>{
        const cells=[...tr.querySelectorAll('td')];
        return {label:cells[0]?.textContent.trim()||'Sin dato',values:cells.slice(1,-1).map(td=>Number((td.textContent.match(/^\s*(\d+)/)||[])[1]||0))};
      });
      if(!series.length||!rows.length){old?.remove();return}
      const signature=JSON.stringify({series,rows,varAText,varBText});
      if(old?.dataset.signature===signature)return;
      old?.remove();
      const wrap=document.createElement('div');wrap.dataset.cruceChart='1';wrap.dataset.signature=signature;wrap.style.cssText='margin-top:20px;border-top:1px solid #dce6e2;padding-top:18px';
      const title=document.createElement('h3');title.textContent='Gráfico del cruce';title.style.margin='0 0 10px';wrap.appendChild(title);
      const vars=document.createElement('div');vars.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:14px';
      const boxA=document.createElement('div');boxA.style.cssText='padding:10px 12px;border-radius:9px;background:#edf7f3;border-left:5px solid #17634e;font-size:12px';boxA.innerHTML=`<strong>VARIABLE A · FILAS</strong><br>${varAText}`;
      const boxB=document.createElement('div');boxB.style.cssText='padding:10px 12px;border-radius:9px;background:#eef4ff;border-left:5px solid #2563eb;font-size:12px';boxB.innerHTML=`<strong>VARIABLE B · BARRAS DE COLORES</strong><br>${varBText}`;
      vars.append(boxA,boxB);wrap.appendChild(vars);
      const note=document.createElement('p');note.innerHTML='<strong>Cómo leerlo:</strong> cada grupo corresponde a una respuesta de la Variable A. Dentro de ese grupo, las barras separadas muestran cómo respondió la misma población a la Variable B.';note.style.cssText='font-size:13px;color:#526862;margin:0 0 14px';wrap.appendChild(note);
      const legendTitle=document.createElement('div');legendTitle.textContent='VARIABLE B · categorías';legendTitle.style.cssText='font-size:12px;font-weight:800;margin-bottom:7px;color:#173d33';wrap.appendChild(legendTitle);
      const legend=document.createElement('div');legend.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px';
      series.forEach((s,i)=>{const item=document.createElement('span');item.style.cssText='display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700';const sw=document.createElement('i');sw.style.cssText=`width:14px;height:14px;border-radius:3px;background:${COLORS[i%COLORS.length]};display:inline-block;border:1px solid rgba(0,0,0,.08)`;item.append(sw,document.createTextNode(s));legend.appendChild(item)});wrap.appendChild(legend);
      rows.forEach(r=>{const total=r.values.reduce((a,b)=>a+b,0);const group=document.createElement('div');group.style.cssText='margin:18px 0;padding:12px;border:1px solid #e0e9e5;border-radius:10px;background:#fbfdfc';const lab=document.createElement('div');lab.innerHTML=`<span style="color:#17634e">VARIABLE A:</span> <strong>${r.label}</strong> · n=${total}`;lab.style.cssText='font-size:13px;margin-bottom:9px';group.appendChild(lab);r.values.forEach((v,i)=>{const p=total?100*v/total:0;const line=document.createElement('div');line.style.cssText='display:grid;grid-template-columns:minmax(120px,190px) 1fr 70px;gap:8px;align-items:center;margin:7px 0';const name=document.createElement('div');name.textContent=series[i];name.style.cssText='font-size:12px;font-weight:650;overflow-wrap:anywhere';const track=document.createElement('div');track.style.cssText='height:25px;border-radius:6px;background:#edf1ef;overflow:hidden';const fill=document.createElement('div');fill.style.cssText=`height:100%;width:${p}%;background:${COLORS[i%COLORS.length]};min-width:${v?3:0}px`;fill.title=`${series[i]}: ${v} (${Math.round(p*10)/10}%)`;track.appendChild(fill);const value=document.createElement('div');value.textContent=`${v} · ${Math.round(p)}%`;value.style.cssText='font-size:12px;font-weight:800;text-align:right';line.append(name,track,value);group.appendChild(line)});wrap.appendChild(group)});
      card.appendChild(wrap);
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
    render();
    const obs=new MutationObserver(schedule);obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
    return()=>{clearTimeout(timer);obs.disconnect()}
  },[]);
  return null;
}
