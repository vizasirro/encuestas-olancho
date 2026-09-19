export async function processEmailQueue(admin, limit = 50) {
  if (!process.env.RESEND_API_KEY || !process.env.VIGILANCIA_NETWORKS_FROM) {
    return { sent: 0, pending_configuration: true };
  }
  const { data: rows, error } = await admin.from('vigilancia_cola_correos').select('*')
    .eq('estado','PENDIENTE').lte('programado_at',new Date().toISOString()).order('created_at').limit(limit);
  if (error) throw error;
  let sent=0,failed=0;
  for(const row of rows||[]){
    await admin.from('vigilancia_cola_correos').update({estado:'ENVIANDO',intentos:Number(row.intentos||0)+1}).eq('id',row.id);
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.VIGILANCIA_NETWORKS_FROM,to:row.destinatarios,subject:row.asunto,html:row.cuerpo_html})});
      if(!response.ok)throw new Error(`Proveedor de correo: HTTP ${response.status}`);
      await admin.from('vigilancia_cola_correos').update({estado:'ENVIADO',enviado_at:new Date().toISOString(),ultimo_error:null}).eq('id',row.id);sent++;
    }catch(error){await admin.from('vigilancia_cola_correos').update({estado:'ERROR',ultimo_error:String(error.message||error).slice(0,500)}).eq('id',row.id);failed++}
  }
  return {sent,failed,pending_configuration:false};
}
