import { createBrowserClient } from '@supabase/ssr';

let browserClient = null;
let exposedClient = null;
const REQUEST_TIMEOUT_MS = 20000;
const REPORT_PAGE_SIZE = 1000;

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

async function detalleReportesPaginado(originalRpc) {
  const detalle = [];

  for (let desde = 0; ; desde += REPORT_PAGE_SIZE) {
    const hasta = desde + REPORT_PAGE_SIZE - 1;
    const { data, error } = await originalRpc('detalle_reportes_encuestas').range(desde, hasta);
    if (error) return { data: detalle, error };

    const bloque = Array.isArray(data) ? data : [];
    detalle.push(...bloque);

    if (bloque.length < REPORT_PAGE_SIZE) break;
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
          if (fn === 'detalle_reportes_encuestas' && !args && !options) {
            return detalleReportesPaginado(originalRpc);
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
