import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {requestJson} from '../src/scripts/request.ts';

test('a request timeout also bounds a stalled response body and never repeats a mutation', async () => {
  globalThis.window=globalThis;
  let requests=0;
  const server=createServer((req,res)=>{
    if(req.url==='/ready'){res.end('ready');return;}
    requests++;res.writeHead(200,{'Content-Type':'application/json'});res.write('{"ok":');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try {
    const url=`http://127.0.0.1:${server.address().port}`;
    await fetch(url+'/ready').then(response=>response.text());
    await assert.rejects(requestJson(url,{method:'POST',body:'write'},1200),e=>e.name==='AbortError');
    assert.equal(requests,1);
  } finally {server.closeAllConnections();server.close();}
});

test('caller cancellation and ordinary server validation errors remain observable', async () => {
  globalThis.window=globalThis;
  const server=createServer((req,res)=>{res.writeHead(429,{'Content-Type':'application/json','Retry-After':'60'});res.end('{"error":"wait"}');});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}`;
  try {
    const {response,data}=await requestJson(url);
    assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'60');assert.deepEqual(data,{error:'wait'});
    const controller=new AbortController();controller.abort();
    await assert.rejects(requestJson(url,{signal:controller.signal}),e=>e.name==='AbortError');
  } finally {server.closeAllConnections();server.close();}
});
