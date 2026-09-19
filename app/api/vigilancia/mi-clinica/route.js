import { NextResponse } from 'next/server';
import { makePinHash, requireVigilanciaUser } from '../../../../utils/vigilancia/server';

const ROLE = new Set(['RESPONSABLE_CLINICA']);

export async function GET(request){
 const access=await requireVigilanciaUser(request,ROLE);if(access.error)return NextResponse.json({error:access.error},{status:access.status});
 const {data,error}=await access.admin.from('vigilancia_clinicas').select('id,codigo,nombre,municipio,email_institucional,jefe_email,delegado_email,qr_token,activa').eq('id',access.perfil.clinica_id).maybeSingle();
 if(error||!data)return NextResponse.json({error:'Clínica no encontrada.'},{status:404});return NextResponse.json({clinica:data});
}

export async function PATCH(request){
 const access=await requireVigilanciaUser(request,ROLE);if(access.error)return NextResponse.json({error:access.error},{status:access.status});
 const body=await request.json();const pin=String(body.pin||'');if(!/^\d{4}$/.test(pin))return NextResponse.json({error:'Ingrese exactamente cuatro dígitos.'},{status:400});
 const {data:clinic}=await access.admin.from('vigilancia_clinicas').select('*').eq('id',access.perfil.clinica_id).maybeSingle();if(!clinic||!clinic.activa)return NextResponse.json({error:'La clínica no está activa.'},{status:409});
 const {error}=await access.admin.from('vigilancia_clinicas').update({pin_hash:makePinHash(pin),updated_at:new Date().toISOString()}).eq('id',clinic.id);if(error)return NextResponse.json({error:'No fue posible cambiar el código.'},{status:500});
 const recipients=[access.perfil.email,clinic.jefe_email,clinic.delegado_email].filter(Boolean);await access.admin.from('vigilancia_cola_correos').insert({tipo:'CREDENCIALES',destinatarios:[...new Set(recipients)],asunto:`VIGILANCIA OLANCHO | Código actualizado ${clinic.codigo}`,cuerpo_html:`<p>El nuevo código de cuatro dígitos de ${clinic.nombre} es <strong>${pin}</strong>.</p>`,referencia_tipo:'CLINICA',referencia_id:clinic.id});
 return NextResponse.json({ok:true});
}
