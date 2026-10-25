import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedPath,splitLocale,visitorLocale,preferenceFromCookie,createTranslator} from '../src/lib/locales.mjs';
import worker from '../worker/index.mjs';

for (const [slug,filename] of [['site-10s','teste-site-10s.mp4'],['site-trailer-30s','trailer-site.mp4'],['site-trailer-v2','trailer-site-v2.mp4']]) {
test(`${slug} video download preserves range responses and supplies a downloadable filename`,async()=>{
  let forwarded;
  const env={ASSETS:{fetch:async request=>{
    forwarded=request;
    return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-2/100'}});
  }}};
  const request=new Request(`https://wiki.test/api/preview/${slug}/download`,{headers:{Range:'bytes=0-2'}});
  const response=await worker.fetch(request,env);
  assert.equal(response.status,206);
  assert.equal(response.headers.get('Content-Disposition'),`attachment; filename="${filename}"`);
  assert.equal(response.headers.get('Content-Type'),'video/mp4');
  assert.equal(response.headers.get('Content-Range'),'bytes 0-2/100');
  assert.equal(forwarded.headers.get('Range'),'bytes=0-2');
  assert.equal(new URL(forwarded.url).pathname,`/previas/${slug}/${filename}`);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);
});
}

test('country default and saved preference are deterministic',()=>{
  const request=(country,cookie='')=>Object.assign(new Request('https://wiki.test/',{headers:{Cookie:cookie}}),{cf:{country}});
  assert.equal(visitorLocale(request('BR')),'pt-BR');
  for(const country of ['US','TH','PT',undefined])assert.equal(visitorLocale(request(country)),'en-US');
  assert.equal(visitorLocale(request('BR','aa-language=en-US')),'en-US');
  assert.equal(visitorLocale(request('US','aa-language=pt-BR')),'pt-BR');
  assert.equal(preferenceFromCookie('aa-language=%ZZ'),null);
  assert.equal(preferenceFromCookie('aa-language=javascript%3Aalert(1)'),null);
});
test('local paths retain state and exempt resources and APIs',()=>{
  assert.equal(localizedPath('/pt-br/artigo/a/?tab=1#Stats','en-US'),'/en-us/artigo/a/?tab=1#Stats');
  assert.equal(localizedPath('/index.html','pt-BR'),'/pt-br/');
  for(const value of ['/api/auth/callback','/data/search.json','/art/a.webp','/_astro/a.js','/licenses/x.txt','https://example.com/','//example.com/','#Stats'])assert.equal(localizedPath(value,'pt-BR'),value);
  assert.deepEqual(splitLocale('/en-us/perfil/abc/'),{locale:'en-US',pathname:'/perfil/abc/'});
});
test('UI templates preserve names, counts, whitespace and authored text',()=>{
  const translate=createTranslator({'Salvar':'Save','Abrir artigo de {0}':'Open article about {0}','UNIDADES':'UNITS','{0} de {1} personagens':'{0} of {1} characters'});
  assert.equal(translate(' Salvar\n'),' Save\n');
  assert.equal(translate('Abrir artigo de Vengeful Swordsman (Sky Reaver)'),'Open article about Vengeful Swordsman (Sky Reaver)');
  assert.equal(translate('555 UNIDADES'),'555 UNITS');
  assert.equal(translate('2 de 555 personagens'),'2 of 555 characters');
  assert.equal(translate('Mensagem sem tradução'),'Mensagem sem tradução');
});
test('Worker redirects documents only and serves localized dynamic profiles',async()=>{
  const paths=[],env={ASSETS:{fetch:async request=>{paths.push(new URL(request.url).pathname);return new Response('asset')}}};
  const br=Object.assign(new Request('https://wiki.test/artigo/a/?tab=1'),{cf:{country:'BR'}});
  const redirect=await worker.fetch(br,env);
  assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'https://wiki.test/pt-br/artigo/a/?tab=1');
  assert.match(redirect.headers.get('cache-control'),/no-store/);
  for(const route of ['/en-us/artigo/a/','/data/units.json','/bot/termos/','/bot/privacidade/']){
    const response=await worker.fetch(new Request('https://wiki.test'+route),env);assert.equal(response.status,200);assert.equal(paths.at(-1),route);
  }
  await worker.fetch(new Request('https://wiki.test/pt-br/perfil/abc_123/'),env);
  assert.equal(paths.at(-1),'/pt-br/perfil/');
  const missing={ASSETS:{fetch:async request=>{
    const path=new URL(request.url).pathname;
    if(path.endsWith('/404.html'))return new Response(null,{status:307,headers:{Location:path.replace(/\.html$/,'')}});
    return path.endsWith('/404')?new Response('English 404'):new Response('missing',{status:404});
  }}};
  const notFound=await worker.fetch(new Request('https://wiki.test/en-us/unknown/'),missing);
  assert.equal(notFound.status,404);assert.equal(await notFound.text(),'English 404');
});
