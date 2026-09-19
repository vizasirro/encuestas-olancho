import { NextResponse } from 'next/server';
import { getHondurasEpiWeek, requireVigilanciaUser, scopeAllows } from '../../../../utils/vigilancia/server';

const VIEWERS=new Set(['ADMIN_GENERAL','VIGILANCIA_REGIONAL','REGIONAL','ECOR','MUNICIPAL','AUDITOR']);
const VALIDATORS=new Set(['ADMIN_GENERAL','VIGILANCIA_REGIONAL']);

export async function GET(request){
 const access=await requireVigilanciaUser(request,VIEWERS);if(access.error)return NextResponse.json({error:access.error},{status:access.status});
 const url=new URL(request.url),now=getHondurasEpiWeek();const anio=Number(url.searchParams.get('anio')||now.year),semana=Number(url.searchParams.get('semana')||now.week);
 const [{data:clinicas,error:ce},{data:boletines,error:be}]=await Promise.all([
  access.admin.from('vigilancia_clinicas').select('id,codigo,nombre,municipio,activa').eq('activa',true).order('municipio').order('nombre'),
  access.admin.from('vigilancia_boletines').select('*').eq('anio',anio).eq('semana_epidemiologica',semana)
 ]);if(ce||be)return NextResponse.json({error:'No fue posible cargar el seguimiento.'},{status:500});
 const visible=(clinicas||[]).filter(c=>scopeAllows(access.perfil,c.municipio,c.id));const bulletinIds=(boletines||[]).map(b=>b.id);
 let lists=[],forms=[],counts=[];if(bulletinIds.length){const results=await Promise.all([
  access.admin.from('vigilancia_listas_nominales').select('*').in('boletin_id',bulletinIds),
  access.admin.from('vigilancia_fichas').select('*,vigilancia_enfermedades(nombre)').in('boletin_id',bulletinIds),
  access.admin.from('vigilancia_conteos').select('boletin_id,cantidad').in('boletin_id',bulletinIds)
 ]);lists=results[0].data||[];forms=results[1].data||[];counts=results[2].data||[]}
 const rows=visible.map(c=>{const b=(boletines||[]).find(x=>x.clinica_id===c.id);const list=b?lists.find(x=>x.boletin_id===b.id):null;const fs=b?forms.filter(x=>x.boletin_id===b.id):[];return{clinica:c,boletin:b||null,total:b?counts.filter(x=>x.boletin_id===b.id).reduce((s,x)=>s+Number(x.cantidad||0),0):0,lista:list,fichas:fs}});
 return NextResponse.json({anio,semana,rows});
}

export async function PATCH(request){
 const access=await requireVigilanciaUser(request,VALIDATORS);if(access.error)return NextResponse.json({error:access.error},{status:access.status});
 const body=await request.json();const table=body.tipo==='FICHA'?'vigilancia_fichas':'vigilancia_listas_nominales';const allowed=new Set(['RECIBIDA','REQUIERE_CORRECCION','VALIDADA']);if(!allowed.has(body.estado))return NextResponse.json({error:'Estado no válido.'},{status:400});
 const update={estado:body.estado,observacion:String(body.observacion||'').trim()||null,updated_at:new Date().toISOString()};if(body.estado==='RECIBIDA')update.recibido_at=new Date().toISOString();if(body.estado==='VALIDADA'){update.validado_at=new Date().toISOString();update.validado_por=access.user.id}
 const {error}=await access.admin.from(table).update(update).eq('id',body.id);if(error)return NextResponse.json({error:'No fue posible actualizar el seguimiento.'},{status:500});return NextResponse.json({ok:true});
}
