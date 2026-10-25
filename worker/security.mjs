// Shared by the Worker and the static-asset header generator.
import scripts from './script-hashes.json' with { type: 'json' };

export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' ${scripts.map(hash => `'sha256-${hash}'`).join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.discordapp.com https://static.wikia.nocookie.net/animeadventures/images/",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-DNS-Prefetch-Control': 'off',
};

export function secureResponse(response, request) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    // Uploaded raster images have their own, even stricter sandbox policy.
    if (name === 'Content-Security-Policy' && headers.has(name)) continue;
    if (name === 'Referrer-Policy' && headers.get(name) === 'no-referrer') continue;
    headers.set(name, value);
  }
  if (new URL(request.url).pathname.startsWith('/api/')) {
    // Never allow intermediary caches to retain account or moderation responses.
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

const rejection = (error, status, headers = {}) => Response.json({error}, {
  status, headers: {'Cache-Control': 'private, no-store', ...headers},
});

/** Edge limits run before authentication, SQL, OAuth exchange or body buffering.
 * Cloudflare supplies CF-Connecting-IP; keys contain only its digest. The native
 * limiter is regional abuse protection, not a global quota or a DDoS guarantee. */
export async function protectApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (write && (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site'))
    return rejection('Reabra o site para continuar.', 403);
  const declared = request.headers.get('Content-Length');
  const limit = url.pathname === '/api/community/media' ? 180000 : 128000;
  if (write && declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit))
    return rejection('O envio ultrapassou o limite.', 413);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return null; // Local tests do not invent a shared visitor identity.
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const limiters = [env.API_RATE_LIMITER];
  if (url.pathname.startsWith('/api/auth/')) limiters.push(env.AUTH_RATE_LIMITER);
  if (write) limiters.push(env.WRITE_RATE_LIMITER);
  if (write && url.pathname === '/api/community/media') limiters.push(env.MEDIA_RATE_LIMITER);
  for (const limiter of limiters) {
    if (limiter && !(await limiter.limit({key: digest})).success)
      return rejection('Você fez várias solicitações em pouco tempo. Aguarde um minuto e tente novamente.', 429, {'Retry-After': '60'});
  }
  return null;
}

export async function readLimited(request, limit) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw Object.assign(new Error('O envio ultrapassou o limite.'), {status: 413});
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {all.set(chunk, offset); offset += chunk.byteLength;}
  return all;
}

export async function readJson(request, limit) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    throw Object.assign(new Error('Formato de envio inválido.'), {status: 415});
  if (Number(request.headers.get('Content-Length') || 0) > limit)
    throw Object.assign(new Error('O envio ultrapassou o limite.'), {status: 413});
  let value;
  try {value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(await readLimited(request, limit)));}
  catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('Não foi possível ler os dados enviados.'), {status: 400});
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Object.assign(new Error('Formato de envio inválido.'), {status: 400});
  return value;
}
