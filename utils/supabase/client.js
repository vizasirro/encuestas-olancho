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

async function detalleCompletoDesdeServidor(client, originalRpc) {
  const { data: detalleOriginal, error: detalleError } = await originalRpc('detalle_reportes_encuestas');
  const original = Array.isArray(detalleOriginal) ? detalleOriginal : [];

  try {
    const { data: { session } } = await client.auth.getSession();
    const token = session?.access_token;
    if (!token) return { data: original, error: detalleError || null };

    const res = await fetch('/api/reportes-detalle', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) return { data: original, error: detalleError || null };

    const payload = await res.json();
    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    const sesionesOriginales = new Set(original.map(x => String(x.sesion_id))).size;
    const sesionesServidor = new Set(detalle.map(x => String(x.sesion_id))).size;

    // Regla de plata: solo reemplaza si la cobertura mejora o iguala la existente.
    if (sesionesServidor < sesionesOriginales) return { data: original, error: detalleError || null };
    return { data: detalle, error: null };
  } catch {
    return { data: original, error: detalleError || null };
  }
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
            return detalleCompletoDesdeServidor(browserClient, originalRpc);
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
