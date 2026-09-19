import { NextResponse } from 'next/server';
import { getHondurasEpiWeek, requireVigilanciaUser, scopeAllows } from '../../../../utils/vigilancia/server';

export async function GET(request){
 const access=await requireVigilanciaUser(request);if(access.error)return NextResponse.json({error:access.error},{status:access.status});
 const url=new URL(request.url),now=getHondurasEpiWeek(),anio=Number(url.searchParams.get('anio')||now.year),semana=Number(url.searchParams.get('semana')||now.week),disease=String(url.searchParams.get('enfermedad')||''),patient=String(url.searchParams.get('paciente')||'').trim();
 const {data:clinics,error:ce}=await access.admin.from('vigilancia_clinicas').select('id,codigo,nombre,municipio').order('municipio').order('nombre');if(ce)return NextResponse.json({error:'No fue posible consultar las clínicas.'},{status:500});
 const visible=(clinics||[]).filter(c=>scopeAllows(access.perfil,c.municipio,c.id)),ids=visible.map(c=>c.id);if(!ids.length)return NextResponse.json({anio,semana,enfermedades:[],boletines:[],eventos:[]});
 const [{data:diseases},{data:bulletins,error:be}]=await Promise.all([
  access.admin.from('vigilancia_enfermedades').select('codigo,nombre,orden').eq('activa',true).order('orden'),
  access.admin.from('vigilancia_boletines').select('*').in('clinica_id',ids).eq('anio',anio).eq('semana_epidemiologica',semana)
 ]);if(be)return NextResponse.json({error:'No fue posible consultar los boletines.'},{status:500});
 const bIds=(bulletins||[]).map(x=>x.id);let counts=[],events=[];if(bIds.length){let cq=access.admin.from('vigilancia_conteos').select('*').in('boletin_id',bIds);if(disease)cq=cq.eq('enfermedad_codigo',disease);let eq=access.admin.from('vigilancia_eventos_inmediatos').select('*').in('boletin_id',bIds);if(disease)eq=eq.eq('enfermedad_codigo',disease);if(patient)eq=eq.ilike('paciente_id',`%${patient}%`);const results=await Promise.all([cq,eq]);counts=results[0].data||[];events=results[1].data||[]}
 const clinicMap=new Map(visible.map(x=>[x.id,x])),bulletinMap=new Map((bulletins||[]).map(x=>[x.id,x])),diseaseMap=new Map((diseases||[]).map(x=>[x.codigo,x.nombre]));
 const boletines=(bulletins||[]).map(b=>({ ...b,clinica:clinicMap.get(b.clinica_id),conteos:counts.filter(c=>c.boletin_id===b.id).map(c=>({...c,enfermedad_nombre:diseaseMap.get(c.enfermedad_codigo)}))}));
 const eventos=events.map(e=>({...e,clinica:clinicMap.get(e.clinica_id),enfermedad_nombre:diseaseMap.get(e.enfermedad_codigo),boletin:bulletinMap.get(e.boletin_id)}));
 return NextResponse.json({anio,semana,enfermedades:diseases||[],boletines,eventos});
}
