import { NextResponse } from 'next/server';
import { cleanEmails, getClients, getHondurasEpiWeek } from '../../../../../utils/vigilancia/server';
import { processEmailQueue } from '../../../../../utils/vigilancia/email';

export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'No autorizado.'},{status:401});
 try{
  const {admin}=getClients(),period=getHondurasEpiWeek(new Date(Date.now()-7*86400000));
  const [{data:clinics,error:ce},{data:bulletins,error:be},{data:profiles}]=await Promise.all([
   admin.from('vigilancia_clinicas').select('*').eq('activa',true),
   admin.from('vigilancia_boletines').select('*').eq('anio',period.year).eq('semana_epidemiologica',period.week),
   admin.from('vigilancia_perfiles').select('email,rol,alcance_municipio').eq('activo',true)
  ]);if(ce||be)throw ce||be;
  const ids=(bulletins||[]).map(x=>x.id);let counts=[];if(ids.length){const result=await admin.from('vigilancia_conteos').select('boletin_id,enfermedad_codigo,cantidad,vigilancia_enfermedades(nombre)').in('boletin_id',ids);if(result.error)throw result.error;counts=result.data||[]}
  for(const clinic of clinics||[]){
   const bulletin=(bulletins||[]).find(x=>x.clinica_id===clinic.id),reported=Boolean(bulletin&&['ENVIADO','CERRADO'].includes(bulletin.estado));
   if(bulletin&&bulletin.estado!=='CERRADO')await admin.from('vigilancia_boletines').update({estado:'CERRADO',cerrado_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',bulletin.id);
   const recipients=cleanEmails([process.env.VIGILANCIA_ALERT_EMAILS,clinic.jefe_email,clinic.delegado_email,clinic.email_institucional,...(profiles||[]).filter(p=>!p.alcance_municipio||p.alcance_municipio===clinic.municipio).map(p=>p.email)]);
   const positives=bulletin?counts.filter(x=>x.boletin_id===bulletin.id&&Number(x.cantidad)>0):[];
   const detail=positives.length?`<ul>${positives.map(x=>`<li>${x.vigilancia_enfermedades?.nombre||x.enfermedad_codigo}: ${x.cantidad}</li>`).join('')}</ul>`:'<p>Sin casos positivos registrados.</p>';
   let queued=false;if(recipients.length){const mail=await admin.from('vigilancia_cola_correos').insert({tipo:'CIERRE_SEMANAL',destinatarios:recipients,asunto:`VIGILANCIA OLANCHO | ${reported?'Boletín':'INCUMPLIMIENTO'} ${clinic.codigo} | SE ${period.week}`,cuerpo_html:`<h2>VIGILANCIA OLANCHO</h2><p>Clínica: ${clinic.nombre} (${clinic.codigo})</p><p>Semana epidemiológica ${period.week} / ${period.year}</p><p><strong>${reported?'Boletín recibido y cerrado.':'No se recibió el boletín obligatorio antes del cierre del lunes a las 8:00 a.m.'}</strong></p>${reported?detail:''}`,referencia_tipo:'BOLETIN',referencia_id:bulletin?.id||null});queued=!mail.error}
   await admin.from('vigilancia_cierres_semanales').upsert({clinica_id:clinic.id,anio:period.year,semana_epidemiologica:period.week,resultado:reported?'NOTIFICO':'NO_NOTIFICO',boletin_id:bulletin?.id||null,cerrado_at:new Date().toISOString(),correo_encolado:queued},{onConflict:'clinica_id,anio,semana_epidemiologica'});
  }
  const email=await processEmailQueue(admin);return NextResponse.json({ok:true,periodo:period,clinicas:(clinics||[]).length,email});
 }catch(error){console.error('vigilancia-cron-cierre',error);return NextResponse.json({error:'Falló el cierre semanal.'},{status:500})}
}
