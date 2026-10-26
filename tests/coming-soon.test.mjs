import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/coming-soon.mjs';

const origin = 'https://wiki.example.test';
function fixture() {
  const paths = [];
  return {
    paths,
    env: {
      get DB() { throw Error('Maintenance must never access the database'); },
      ASSETS: { async fetch(request) {
        const url = new URL(request.url);
        paths.push(url.pathname);
        assert.equal(url.search, '');
        assert.equal(request.headers.get('Cookie'), null);
        return new Response(url.pathname === '/' ? '<h1>Em breve / Coming soon</h1>' : 'asset', {
          headers: {'Content-Type': url.pathname === '/' ? 'text/html' : 'text/plain'},
        });
      } },
    },
  };
}

test('all former pages show the same maintenance screen without accessing accounts', async () => {
  const f = fixture();
  for (const path of ['/', '/pt-br/', '/en-us/', '/pt-br/comunidade/', '/en-us/artigo/example/', '/perfil/player/', '/previas/site-trailer-v2/', '/404.html']) {
    const response = await worker.fetch(new Request(origin + path + '?code=private', {
      headers: {Cookie: 'private=session'},
    }), f.env);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /Em breve \/ Coming soon/);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('Content-Security-Policy'), /script-src 'none'/);
  }
  assert.ok(f.paths.every(path => path === '/'));
});

test('APIs and writes are unavailable before any asset, account or storage operation', async () => {
  const f = fixture();
  for (const path of ['/api', '/api/session', '/api/auth/callback?code=private', '/api/community/media/image', '/api/community/posts']) {
    for (const method of ['GET', 'HEAD', 'POST', 'DELETE']) {
      const response = await worker.fetch(new Request(origin + path, {method}), f.env);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Retry-After'), '3600');
      if (method === 'HEAD') assert.equal(await response.text(), '');
      else assert.match((await response.json()).error, /reformulação/);
    }
  }
  assert.equal((await worker.fetch(new Request(origin, {method: 'POST', body: 'ignored'}), f.env)).status, 503);
  assert.deepEqual(f.paths, []);
});

test('only maintenance assets and bot legal pages remain available; HEAD has no body', async () => {
  const f = fixture();
  for (const path of ['/coming-soon/style.css', '/coming-soon/fabled-kingdom.webp', '/robots.txt', '/bot/termos/', '/bot/privacidade/index.html']) {
    const response = await worker.fetch(new Request(origin + path), f.env);
    assert.equal(response.status, 200);
  }
  assert.equal(f.paths.at(-1), '/bot/privacidade/');
  const before = f.paths.length;
  for (const path of ['/_astro/old.js', '/art/wiki/old.webp', '/previas/old.mp4', '/sitemap.xml', '/coming-soon/private.json']) {
    assert.equal((await worker.fetch(new Request(origin + path), f.env)).status, 404, path);
  }
  assert.equal(f.paths.length, before);
  const response = await worker.fetch(new Request(origin + '/en-us/', {method: 'HEAD'}), f.env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
