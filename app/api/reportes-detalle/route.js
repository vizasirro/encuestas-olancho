import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const REPORT_ROLES=new Set(['ADMIN_GENERAL','ADMIN_ENCUESTAS','CONSULTA_ECOR','CONSULTA_MUNICIPAL','CONSULTA_ESTABLECIMIENTO','DIRECTOR_HOSPITALARIO']);
const norm=v=>String(v??'').trim().toUpperCase();

export async function GET(request){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
    if(!url||!anon||!service) return NextResponse.json({error:'Configuración de servidor incompleta.'},{status:503});

    const authHeader=request.headers.get('authorization')||'';
    const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!token) return NextResponse.json({error:'No autorizado.'},{status:401});

    const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await authClient.auth.getUser(token);
    if(userError||!user) return NextResponse.json({error:'Sesión inválida.'},{status:401});

    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:perfil,error:perfilError}=await admin.from('perfiles')
      .select('rol,activo,alcance_ecor,alcance_municipio,alcance_establecimiento_codigo,alcance_hospital_nombre')
      .eq('id',user.id).maybeSingle();
    if(perfilError||!perfil||!perfil.activo||!REPORT_ROLES.has(perfil.rol)) return NextResponse.json({error:'Acceso no autorizado.'},{status:403});

    const {data:sesiones,error:sesError}=await admin.from('encuestas_sesiones')
      .select('id,folio,tipo_encuesta,establecimiento_codigo,establecimiento_nombre,enviada_at,operado,estado')
      .eq('estado','ENVIADA');
    if(sesError) throw sesError;

    const codigos=[...new Set((sesiones||[]).map(s=>s.establecimiento_codigo).filter(Boolean))];
    const catalogo=[];
    for(let i=0;i<codigos.length;i+=200){
      const {data,error}=await admin.from('catalogo_establecimientos_encuestas')
        .select('codigo,nombre,ecor,municipio').in('codigo',codigos.slice(i,i+200));
      if(error) throw error;
      catalogo.push(...(data||[]));
    }
    const catMap=new Map(catalogo.map(c=>[String(c.codigo),c]));

    const autorizadas=(sesiones||[]).filter(s=>{
      const c=catMap.get(String(s.establecimiento_codigo))||{};
      switch(perfil.rol){
        case 'ADMIN_GENERAL': case 'ADMIN_ENCUESTAS': return true;
        case 'CONSULTA_ECOR': return norm(c.ecor)===norm(perfil.alcance_ecor);
        case 'CONSULTA_MUNICIPAL': return norm(c.municipio)===norm(perfil.alcance_municipio);
        case 'CONSULTA_ESTABLECIMIENTO': return norm(s.establecimiento_codigo)===norm(perfil.alcance_establecimiento_codigo);
        case 'DIRECTOR_HOSPITALARIO': return norm(c.nombre||s.establecimiento_nombre)===norm(perfil.alcance_hospital_nombre);
        default: return false;
      }
    });

    const ids=autorizadas.map(s=>s.id);
    const respuestas=[];
    for(let i=0;i<ids.length;i+=100){
      const {data,error}=await admin.from('encuestas_respuestas')
        .select('sesion_id,pregunta_id,respuesta').in('sesion_id',ids.slice(i,i+100));
      if(error) throw error;
      respuestas.push(...(data||[]));
    }
    const preguntaIds=[...new Set(respuestas.map(r=>r.pregunta_id).filter(v=>v!==null&&v!==undefined))];
    const preguntas=[];
    for(let i=0;i<preguntaIds.length;i+=200){
      const {data,error}=await admin.from('encuestas_preguntas')
        .select('id,orden,dimension,texto,tipo_respuesta').in('id',preguntaIds.slice(i,i+200));
      if(error) throw error;
      preguntas.push(...(data||[]));
    }
    const pMap=new Map(preguntas.map(p=>[String(p.id),p]));
    const sMap=new Map(autorizadas.map(s=>[String(s.id),s]));

    const detalle=respuestas.map(r=>{
      const s=sMap.get(String(r.sesion_id));
      const p=pMap.get(String(r.pregunta_id));
      if(!s||!p) return null;
      const c=catMap.get(String(s.establecimiento_codigo))||{};
      return {
        sesion_id:s.id,folio:s.folio,tipo_encuesta:s.tipo_encuesta,
        establecimiento_codigo:s.establecimiento_codigo,
        establecimiento_nombre:c.nombre||s.establecimiento_nombre,
        ecor:c.ecor||null,municipio:c.municipio||null,enviada_at:s.enviada_at,
        operado:s.operado,pregunta_id:p.id,orden:p.orden,dimension:p.dimension,
        pregunta:p.texto,tipo_respuesta:p.tipo_respuesta,respuesta:r.respuesta
      };
    }).filter(Boolean);

    return NextResponse.json({detalle,meta:{sesiones:autorizadas.length,conDetalle:new Set(detalle.map(x=>x.sesion_id)).size}});
  }catch(error){
    console.error('reportes-detalle',error);
    return NextResponse.json({error:'No fue posible construir el detalle completo.'},{status:500});
  }
}
