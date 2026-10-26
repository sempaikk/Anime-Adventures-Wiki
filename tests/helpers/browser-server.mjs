// Temporary local review harness. Synthetic sessions never leave this process.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture,call,publish,origin} from './community.mjs';
import {communityRequest} from '../../worker/community.mjs';
import {accountRequest} from '../../worker/accounts.mjs';
const port=Number(process.env.REVIEW_PORT||4399);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local review port.');
const build=process.env.REVIEW_BUILD;if(!build)throw Error('Set REVIEW_BUILD to the isolated build directory.');
const worker=build?(await import(pathToFileURL(path.join(build,'worker/index.mjs')).href)).default:null;
const f=fixture();
for(const [i,user] of f.users.entries())await publish(f,user,'jogador-'+i,{name:['Equipe de teste local','Jogador de teste','Outro jogador de teste'][i],bio:'Perfil isolado para conferir a interface. Nenhum dado foi publicado.'});
await call(f,'/posts',f.users[2],'POST',{body:'[TESTE LOCAL] Publicação de outro jogador.'});
const art=JSON.parse(fs.readFileSync('source/interface-art.json'));
const upload=await communityRequest(new Request(origin+'/api/community/media',{method:'POST',headers:{Origin:origin,Cookie:f.users[1].cookie,'Content-Type':'image/webp'},body:fs.readFileSync('public'+art.city.image)}),f.env);
const photo=await upload.json();
await call(f,'/posts',f.users[1],'POST',{body:'[TESTE LOCAL] Publicação com foto.',...(upload.ok?{image_id:photo.id}:{})});
if(build){
 const dist=path.resolve(build,'dist');
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
 f.env.ASSETS={async fetch(request){
  let target=path.resolve(dist,'.'+decodeURIComponent(new URL(request.url).pathname));
  if(!target.startsWith(dist+path.sep)&&target!==dist)return new Response('Forbidden',{status:403});
  for(const candidate of [target,target+'.html',path.join(target,'index.html')]){
   if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return new Response(fs.readFileSync(candidate),{headers:{'Content-Type':types[path.extname(candidate)]||'application/octet-stream'}});
  }
  return new Response('Not found',{status:404});
 }};
}
const server=http.createServer(async(req,res)=>{
 try{
  const path=req.url||'/';
  if(worker||path.startsWith('/api/')){
   const chunks=[];for await(const part of req)chunks.push(part);
   const index=Number(req.headers['x-review-user']??-1),user=f.users[index],headers=new Headers({'Origin':origin});
   headers.set('Cookie',[user?.cookie,req.headers.cookie].filter(Boolean).join('; '));
   if(req.headers['content-type'])headers.set('Content-Type',req.headers['content-type']);
   const incoming=new Request(origin+path,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=worker?await worker.fetch(incoming,f.env):await communityRequest(incoming,f.env)||await accountRequest(incoming,f.env);
   const outgoing=Object.fromEntries(response.headers);if(outgoing.location?.startsWith(origin))outgoing.location=outgoing.location.replace(origin,`http://127.0.0.1:${port}`);res.writeHead(response.status,outgoing);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const target=/^\/perfil\/[a-z0-9_-]{3,24}\/?(?:\?|$)/.test(path)?'/perfil/':path;
  const response=await fetch('http://127.0.0.1:4321'+target);
  res.writeHead(response.status,{'Content-Type':response.headers.get('Content-Type')||'text/html'});res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Local review failed');console.error(error.message)}
});
server.listen(port,'127.0.0.1',()=>console.log('Local review with isolated SQLite ready.'));
