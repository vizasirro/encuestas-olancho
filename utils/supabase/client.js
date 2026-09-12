import { createBrowserClient } from '@supabase/ssr';

let browserClient = null;
let exposedClient = null;
const REQUEST_TIMEOUT_MS = 20000;

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  let upstreamAbort;

  if (upstreamSignal) {
    upstreamAbort = () => controller.abort(upstreamSignal.reason);
    if (upstreamSignal.aborted) upstreamAbort();
    else upstreamSignal.addEventListener('abort', upstreamAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(new Error('REQUEST_TIMEOUT')), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
    if (upstreamSignal && upstreamAbort) upstreamSignal.removeEventListener('abort', upstreamAbort);
  }
}

async function reconstruirDetalleCompleto(client, originalRpc) {
  // Fuente autorizada de sesiones: esta RPC ya aplica el alcance del usuario.
  const [{ data: lista, error: listaError }, { data: detalleOriginal, error: detalleError }] = await Promise.all([
    originalRpc('listar_reportes_encuestas'),
    originalRpc('detalle_reportes_encuestas')
  ]);

  if (listaError) return { data: Array.isArray(detalleOriginal) ? detalleOriginal : [], error: detalleError || listaError };

  const sesiones = (Array.isArray(lista) ? lista : []).filter(x => x?.estado === 'ENVIADA');
  const original = Array.isArray(detalleOriginal) ? detalleOriginal : [];
  if (!sesiones.length) return { data: [], error: null };

  // Si la RPC histórica ya trae todas las sesiones, no hacemos ningún trabajo adicional.
  const sesionesOriginales = new Set(original.map(x => String(x.sesion_id)));
  if (sesiones.every(x => sesionesOriginales.has(String(x.sesion_id)))) {
    return { data: original, error: null };
  }

  const ids = sesiones.map(x => x.sesion_id).filter(Boolean);
  const respuestas = [];

  // Se consulta por bloques para evitar URLs demasiado largas.
  for (let i = 0; i < ids.length; i += 100) {
    const bloque = ids.slice(i, i + 100);
    const { data, error } = await client
      .from('encuestas_respuestas')
      .select('sesion_id,pregunta_id,respuesta')
      .in('sesion_id', bloque);
    if (error) {
      // Fallback seguro: nunca rompe el reporte existente si una política RLS impide lectura directa.
      return { data: original, error: detalleError || null };
    }
    if (Array.isArray(data)) respuestas.push(...data);
  }

  // Reutiliza el catálogo ya devuelto por la RPC y completa cualquier pregunta faltante desde el catálogo.
  const preguntaMap = new Map();
  original.forEach(x => {
    if (x?.pregunta_id != null) {
      preguntaMap.set(String(x.pregunta_id), {
        id: x.pregunta_id,
        orden: x.orden,
        dimension: x.dimension,
        texto: x.pregunta,
        tipo_respuesta: x.tipo_respuesta
      });
    }
  });

  const faltantes = [...new Set(respuestas.map(r => String(r.pregunta_id)).filter(id => !preguntaMap.has(id)))];
  if (faltantes.length) {
    for (let i = 0; i < faltantes.length; i += 100) {
      const bloque = faltantes.slice(i, i + 100);
      const { data, error } = await client
        .from('encuestas_preguntas')
        .select('id,orden,dimension,texto,tipo_respuesta')
        .in('id', bloque);
      if (error) return { data: original, error: detalleError || null };
      (Array.isArray(data) ? data : []).forEach(p => preguntaMap.set(String(p.id), p));
    }
  }

  const sesionMap = new Map(sesiones.map(s => [String(s.sesion_id), s]));
  const detalle = [];

  respuestas.forEach(r => {
    const s = sesionMap.get(String(r.sesion_id));
    const p = preguntaMap.get(String(r.pregunta_id));
    if (!s || !p) return;
    detalle.push({
      sesion_id: s.sesion_id,
      folio: s.folio,
      tipo_encuesta: s.tipo_encuesta,
      establecimiento_codigo: s.establecimiento_codigo,
      establecimiento_nombre: s.establecimiento_nombre,
      ecor: s.ecor,
      municipio: s.municipio,
      enviada_at: s.enviada_at,
      operado: s.operado,
      pregunta_id: p.id,
      orden: p.orden,
      dimension: p.dimension,
      pregunta: p.texto,
      tipo_respuesta: p.tipo_respuesta,
      respuesta: r.respuesta
    });
  });

  // Solo sustituye la RPC si la reconstrucción mejora o iguala la cobertura conocida.
  const sesionesReconstruidas = new Set(detalle.map(x => String(x.sesion_id)));
  if (sesionesReconstruidas.size < sesionesOriginales.size) {
    return { data: original, error: detalleError || null };
  }

  return { data: detalle, error: null };
}

export function createClient() {
  if (exposedClient) return exposedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Faltan las variables públicas de Supabase en Vercel.');
  }

  browserClient = createBrowserClient(url, key, {
    global: { fetch: fetchWithTimeout }
  });

  const originalRpc = browserClient.rpc.bind(browserClient);
  exposedClient = new Proxy(browserClient, {
    get(target, prop) {
      if (prop === 'rpc') {
        return (fn, args, options) => {
          if (fn === 'detalle_reportes_encuestas') {
            return reconstruirDetalleCompleto(browserClient, originalRpc);
          }
          return originalRpc(fn, args, options);
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });

  return exposedClient;
}
