import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../worker/index.mjs';
import {protectApi, readJson, secureResponse, securityHeaders} from '../worker/security.mjs';
import {imageDimensions} from '../worker/raster.mjs';

const origin = 'https://wiki.example.test';
const write = (path, options = {}) => new Request(origin + path, {
  method: 'POST', headers: {Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...options.headers},
  ...(options.body ? {body: options.body} : {}),
});

test('strict browser policy covers static documents, redirects and API failures', async () => {
  assert.doesNotMatch(securityHeaders['Content-Security-Policy'], /unsafe-eval|script-src[^;]*unsafe-inline/);
  assert.match(securityHeaders['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(securityHeaders['Content-Security-Policy'], /img-src[^;]*https:\/\/static\.wikia\.nocookie\.net\/animeadventures\/images\//);
  const env = {ASSETS:{fetch:async()=>new Response('<h1>Wiki</h1>',{headers:{'Content-Type':'text/html'}})}};
  for (const path of ['/pt-br/', '/biblioteca/', '/api/session', '/api/community/me']) {
    const response = await worker.fetch(new Request(origin + path), env);
    for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value, `${path}: ${name}`);
    if (path.startsWith('/api/')) assert.match(response.headers.get('Cache-Control'), /private.*no-store/);
  }
  const media = secureResponse(new Response('image', {headers:{'Content-Security-Policy':"default-src 'none'; sandbox"}}), new Request(origin + '/api/community/media/abc'));
  assert.equal(media.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
});

test('response hardening keeps independent authentication cookies and partial downloads', () => {
  const response = new Response(null, {status:303, headers:{Location:'/pt-br/conta/','Referrer-Policy':'no-referrer'}});
  response.headers.append('Set-Cookie','__Host-aa-oauth=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
  response.headers.append('Set-Cookie','__Host-aa-session=opaque; Path=/; Secure; HttpOnly; SameSite=Lax');
  const result = secureResponse(response, new Request(origin + '/api/auth/callback'));
  assert.equal(result.status,303);
  assert.equal(result.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(result.headers.getSetCookie().length,2);
  const partial = secureResponse(new Response('bytes', {status:206, headers:{'Content-Range':'bytes 0-4/100'}}),new Request(origin+'/api/preview/site-10s/download'));
  assert.equal(partial.status,206);assert.equal(partial.headers.get('Content-Range'),'bytes 0-4/100');
});

test('cross-origin writes and oversized requests are refused before touching storage', async () => {
  let accessed = 0;
  const env = {get DB(){accessed++;throw Error('must not touch private storage')}};
  for (const headers of [{Origin:'https://attacker.example'}, {Origin:origin,'Sec-Fetch-Site':'cross-site'}]) {
    const response = await worker.fetch(write('/api/community/me',{headers}),env);
    assert.equal(response.status,403);
  }
  const oversized = await worker.fetch(write('/api/favorites/merge',{headers:{'Content-Length':'200000'}}),env);
  assert.equal(oversized.status,413);assert.equal(accessed,0);
});

test('native edge rate limits use digested identities and separate auth, writes and media', async () => {
  const calls = [];
  const limiter = name => ({limit:async({key})=>{calls.push({name,key});return {success:true}}});
  const env = Object.fromEntries(['API','AUTH','WRITE','MEDIA'].map(name=>[name+'_RATE_LIMITER',limiter(name)]));
  await protectApi(new Request(origin+'/api/auth/discord',{headers:{'CF-Connecting-IP':'192.0.2.1'}}),env);
  assert.deepEqual(calls.map(c=>c.name),['API','AUTH']);
  assert.ok(calls.every(c=>/^[a-f0-9]{64}$/.test(c.key)&&!c.key.includes('192.0.2.1')));
  const key=calls[0].key;calls.length=0;
  await protectApi(write('/api/community/media'),env);
  assert.deepEqual(calls.map(c=>c.name),['API','WRITE','MEDIA']);assert.ok(calls.every(c=>c.key===key));
  env.WRITE_RATE_LIMITER={limit:async()=>({success:false})};
  const blocked=await protectApi(write('/api/favorites/merge'),env);
  assert.equal(blocked.status,429);assert.equal(blocked.headers.get('Retry-After'),'60');
  assert.match(blocked.headers.get('Cache-Control'),/no-store/);
  assert.equal(await protectApi(new Request(origin+'/art/wiki/test.webp'),env),null);
});

test('JSON readers stop chunked data by bytes and reject primitive or malformed bodies', async () => {
  let cancelled=false;
  const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(80))},cancel(){cancelled=true}});
  await assert.rejects(readJson(new Request(origin,{method:'POST',headers:{'Content-Type':'application/json'},body,duplex:'half'}),100),e=>e.status===413);
  assert.equal(cancelled,true);
  for(const body of ['null','[]','"text"','true','{bad}',new Uint8Array([0xff])])
    await assert.rejects(readJson(new Request(origin,{method:'POST',headers:{'Content-Type':'application/json'},body}),100),e=>e.status===400);
  await assert.rejects(readJson(new Request(origin,{method:'POST',headers:{'Content-Type':'application/jsonp'},body:'{}'}),100),e=>e.status===415);
  assert.deepEqual(await readJson(new Request(origin,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:'{"ids":[]}'}),100),{ids:[]});
});

test('raster validation rejects spoofed headers, animated containers, truncation and trailing code', () => {
  const webp=fs.readFileSync('public/art/navigation/units.webp');
  assert.equal(imageDimensions(webp)?.mime,'image/webp');
  const png=fs.readFileSync('public/art/official/roblox-cover.png');
  assert.deepEqual(imageDimensions(png),{mime:'image/png',width:768,height:431});
  const invalid=Buffer.from(webp);invalid.writeUInt32LE(10000000,4);
  for(const bytes of [webp.subarray(0,30),invalid,Buffer.concat([webp,Buffer.from('<script>alert(1)</script>')]),Buffer.from('<svg onload=alert(1)></svg>'),png.subarray(0,33)]) assert.equal(imageDimensions(bytes),null);
  const animation=Buffer.from(webp);animation.write('ANIM',12);assert.equal(imageDimensions(animation),null);
  const alteredPNG=Buffer.from(png);alteredPNG[19]^=1;assert.equal(imageDimensions(alteredPNG),null);
  const emptyPNG=Buffer.alloc(33);emptyPNG[0]=137;emptyPNG.write('PNG',1);emptyPNG.write('IHDR',12);emptyPNG.writeUInt32BE(10,16);emptyPNG.writeUInt32BE(10,20);assert.equal(imageDimensions(emptyPNG),null);
});
