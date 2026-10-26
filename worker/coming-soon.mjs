const publicAssets = new Set([
  '/coming-soon/style.css',
  '/coming-soon/fabled-kingdom.webp',
  '/coming-soon/space-grotesk.woff2',
  '/coming-soon/font-license.txt',
  '/coming-soon/credits.json',
  '/robots.txt',
]);
const legalDocument = /^\/bot\/(termos|privacidade)(?:\/index\.html|\/)?$/;
const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'none'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function finish(response, request) {
  const result = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) result.set(name, value);
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    headers: result,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // No imports, SQL, OAuth, uploads or scheduled cleanup from the old site.
    if (/^\/api(?:\/|$)/.test(url.pathname) || !['GET', 'HEAD'].includes(request.method)) {
      return finish(Response.json({
        error: 'Site em reformulação. / Website under redesign.',
      }, {status: 503, headers: {'Retry-After': '3600'}}), request);
    }
    if (url.pathname === '/favicon.ico') return finish(new Response(null, {status: 204}), request);

    const legal = url.pathname.match(legalDocument);
    if (legal) url.pathname = `/bot/${legal[1]}/`;
    else if (!publicAssets.has(url.pathname)) {
      // Obsolete scripts, media and downloads are never served from the archive.
      if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) {
        return finish(new Response(null, {status: 404}), request);
      }
      url.pathname = '/';
    }
    url.search = '';
    try {
      return finish(await env.ASSETS.fetch(new Request(url)), request);
    } catch {
      return finish(new Response('Em breve. Coming soon.', {
        status: 503,
        headers: {'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '3600'},
      }), request);
    }
  },
};
