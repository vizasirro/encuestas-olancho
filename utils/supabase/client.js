import { createBrowserClient } from '@supabase/ssr';

let browserClient = null;
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

export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Faltan las variables públicas de Supabase en Vercel.');
  }

  browserClient = createBrowserClient(url, key, {
    global: { fetch: fetchWithTimeout }
  });
  return browserClient;
}
