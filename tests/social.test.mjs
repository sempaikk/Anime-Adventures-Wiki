import test from 'node:test';
import assert from 'node:assert/strict';
import {communityRequest} from '../worker/community.mjs';
import {maintainStorage} from '../worker/maintenance.mjs';
import {fixture,call,publish,req,origin} from './helpers/community.mjs';

async function setup(){const f=fixture();for(const [i,u] of f.users.entries())await publish(f,u,'jogador-'+i);return f}
async function post(f,user,extra={}){const result=await call(f,'/posts',user,'POST',{body:'Uma descoberta no jogo.',...extra});assert.equal(result.status,201,JSON.stringify(result.data));return result.data.post}

test('public feed shows real posts in order, preserves literal text, and enforces ownership',async()=>{
  const f=await setup(),[admin,a,b]=f.users;
  assert.deepEqual((await call(f,'/posts')).data.posts,[]);
  const first=await post(f,a,{body:'<script>alert("x")</script> Dica do jogador'}),second=await post(f,b);
  const publicFeed=(await call(f,'/posts')).data.posts;
  assert.deepEqual(publicFeed.map(p=>p.id),[second.id,first.id]);
  assert.equal(publicFeed[1].body,'<script>alert("x")</script> Dica do jogador');
  assert.equal(publicFeed[0].can_edit,false);assert.equal('author_id'in publicFeed[0],false);
  assert.equal((await call(f,'/posts/'+first.id,b,'PATCH',{body:'alterado'})).status,403);
  assert.equal((await call(f,'/posts/'+first.id,b,'DELETE')).status,403);
  assert.equal((await call(f,'/posts/'+first.id,a,'PATCH',{body:'Uma dica revisada.',image_id:null})).status,200);
  assert.equal((await call(f,'/posts/'+first.id,admin,'DELETE')).status,200);
  assert.deepEqual((await call(f,'/posts')).data.posts.map(p=>p.id),[second.id]);
  f.sqlite.close();
});
test('participation requires a session, same-origin writes and a deliberately public profile',async()=>{
  const f=fixture(),a=f.users[1];
  assert.equal((await call(f,'/posts',null,'POST',{body:'x'})).status,401);
  assert.equal((await call(f,'/posts',a,'POST',{body:'x'})).status,409);
  await publish(f,a,'autor-publico');
  const denied=await communityRequest(req('/posts',a,'POST',{body:'x'},{Origin:'https://other.test'}),f.env);
  assert.equal(denied.status,403);
  assert.equal((await call(f,'/posts',a,'POST',{body:'x'.repeat(2001)})).status,400);
  assert.equal((await call(f,'/posts',a,'POST',{body:' '})).status,400);
  await post(f,a);await publish(f,a,'autor-publico',{published:false});
  assert.deepEqual((await call(f,'/posts')).data.posts,[]);
  f.sqlite.close();
});
test('friendships require explicit acceptance and constrain the friends feed',async()=>{
  const f=await setup(),[,a,b]=f.users;const bPost=await post(f,b);
  assert.equal((await call(f,'/posts?feed=friends')).status,401);
  assert.deepEqual((await call(f,'/posts?feed=friends',a)).data.posts,[]);
  assert.equal((await call(f,'/friends/jogador-2',a,'POST')).data.relationship,'sent');
  assert.equal((await call(f,'/friends/jogador-2',a,'POST')).data.relationship,'sent');
  assert.equal((await call(f,'/friends/jogador-1',b,'POST')).data.relationship,'received');
  assert.equal((await call(f,'/friends/jogador-2',a,'PATCH')).status,409);
  assert.equal((await call(f,'/friends/jogador-1',b,'PATCH')).data.relationship,'accepted');
  assert.deepEqual((await call(f,'/posts?feed=friends',a)).data.posts.map(p=>p.id),[bPost.id]);
  assert.equal((await call(f,'/friends',a)).data.friends[0].handle,'jogador-2');
  assert.equal((await call(f,'/friends',null)).status,401);
  await call(f,'/friends/jogador-1',b,'DELETE');
  assert.deepEqual((await call(f,'/posts?feed=friends',a)).data.posts,[]);
  assert.equal((await call(f,'/friends/jogador-1',a,'POST')).status,400);
  f.sqlite.close();
});
test('post discussions protect authorship and disappear with their post',async()=>{
  const f=await setup(),[,a,b]=f.users,p=await post(f,a);
  const result=await call(f,'/posts/'+p.id+'/comments',b,'POST',{body:'Obrigado pela dica!'});
  assert.equal(result.status,201);const comment=result.data.comments[0];
  assert.equal(comment.author.handle,'jogador-2');
  assert.equal((await call(f,'/post-comments/'+comment.id,a,'DELETE')).status,403);
  assert.equal((await call(f,'/posts')).data.posts[0].comment_count,1);
  await publish(f,b,'jogador-2',{published:false});
  assert.equal((await call(f,'/posts')).data.posts[0].comment_count,0);
  assert.deepEqual((await call(f,'/posts/'+p.id+'/comments')).data.comments,[]);
  await publish(f,b,'jogador-2');
  await call(f,'/post-comments/'+comment.id,b,'DELETE');
  assert.deepEqual((await call(f,'/posts/'+p.id+'/comments')).data.comments,[]);
  await call(f,'/posts/'+p.id,a,'DELETE');
  assert.equal((await call(f,'/posts/'+p.id+'/comments')).status,404);
  f.sqlite.close();
});
test('a post photo cannot be borrowed, abandoned cleanup preserves it, and privacy revokes access',async()=>{
  const f=await setup(),[,a,b]=f.users;
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  const uploaded=await communityRequest(new Request(origin+'/api/community/media',{method:'POST',headers:{Origin:origin,Cookie:a.cookie,'Content-Type':'image/png'},body:bytes}),f.env);
  assert.equal(uploaded.status,201);const image=await uploaded.json();
  assert.equal((await call(f,'/posts',b,'POST',{body:'foto',image_id:image.id})).status,400);
  assert.equal((await communityRequest(req('/media/'+image.id),f.env)).status,404);
  const p=await post(f,a,{body:'',image_id:image.id});
  assert.equal((await communityRequest(req('/media/'+image.id),f.env)).status,200);
  f.sqlite.prepare('UPDATE community_media SET created_at=? WHERE id=?').run(Math.floor(Date.now()/1000)-90001,image.id);
  await maintainStorage(f.env);
  assert.equal((await communityRequest(req('/media/'+image.id),f.env)).status,200);
  await publish(f,a,'jogador-1',{published:false});
  assert.equal((await communityRequest(req('/media/'+image.id),f.env)).status,404);
  assert.equal((await communityRequest(req('/media/'+image.id,a),f.env)).status,200);
  await publish(f,a,'jogador-1');await call(f,'/posts/'+p.id,a,'DELETE');await maintainStorage(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_media WHERE id=?').get(image.id).n,0);
  f.sqlite.close();
});
test('publication and comment limits are enforced by the database even for deleted content',async()=>{
  const f=await setup(),[,a,b]=f.users;
  const p=await post(f,a);
  for(let i=1;i<10;i++)await post(f,a);
  await call(f,'/posts/'+p.id,a,'DELETE');
  assert.equal((await call(f,'/posts',a,'POST',{body:'limite'})).status,429);
  const other=await post(f,b);
  for(let i=0;i<30;i++)assert.equal((await call(f,'/posts/'+other.id+'/comments',a,'POST',{body:'comentário '+i})).status,201);
  assert.equal((await call(f,'/posts/'+other.id+'/comments',a,'POST',{body:'limite'})).status,429);
  f.sqlite.close();
});
test('feed pagination and profile filtering return bounded pages without duplication',async()=>{
  const f=await setup();for(const u of f.users)for(let i=0;i<7;i++)await post(f,u);
  const first=(await call(f,'/posts')).data,second=(await call(f,'/posts?before='+first.next)).data;
  assert.equal(first.posts.length,12);assert.equal(second.posts.length,9);assert.equal(second.next,null);
  assert.equal(new Set([...first.posts,...second.posts].map(p=>p.id)).size,21);
  assert.equal((await call(f,'/posts?profile=jogador-1')).data.posts.length,7);
  assert.equal((await call(f,'/posts?before=NaN')).status,400);
  f.sqlite.close();
});
test('reports are private, idempotent and actionable by the existing moderator',async()=>{
  const f=await setup(),[admin,a,b]=f.users,p=await post(f,a);
  for(let i=0;i<2;i++)assert.equal((await call(f,'/posts/'+p.id+'/report',b,'POST',{reason:'Precisa de revisão.'})).status,200);
  assert.equal((await call(f,'/post-reports',a)).status,403);
  const reports=(await call(f,'/post-reports',admin)).data.reports;assert.equal(reports.length,1);
  assert.equal((await call(f,'/post-reports/'+reports[0].id,a,'PATCH')).status,403);
  assert.equal((await call(f,'/post-reports/'+reports[0].id,admin,'PATCH')).status,200);
  assert.equal((await call(f,'/post-reports',admin)).data.reports.length,0);
  assert.equal((await call(f,'/posts')).data.posts.length,1);
  await call(f,'/posts/'+p.id,admin,'DELETE');assert.equal((await call(f,'/post-reports',admin)).data.reports.length,0);
  f.sqlite.close();
});

test('cancelling friendship requests does not reset the daily quota',async()=>{
  const f=await setup(),[,a]=f.users;
  for(let i=0;i<30;i++){
    assert.equal((await call(f,'/friends/jogador-2',a,'POST')).status,200);
    assert.equal((await call(f,'/friends/jogador-2',a,'DELETE')).status,200);
  }
  assert.equal((await call(f,'/friends/jogador-2',a,'POST')).status,429);
  f.sqlite.close();
});
test('simultaneous photo uploads cannot exceed the daily reservation',async()=>{
  const f=await setup(),[,a]=f.users,time=Math.floor(Date.now()/1000);
  for(let i=0;i<29;i++)f.sqlite.prepare('INSERT INTO community_media(id,owner_id,bytes,mime,width,height,created_at) VALUES(?,?,?,?,?,?,?)').run(i.toString(16).padStart(32,'0'),a.id,new Uint8Array([1]),'image/png',1,1,time);
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  const upload=()=>communityRequest(new Request(origin+'/api/community/media',{method:'POST',headers:{Origin:origin,Cookie:a.cookie,'Content-Type':'image/png'},body:bytes}),f.env);
  const results=await Promise.all([upload(),upload()]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,429]);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_media WHERE owner_id=?').get(a.id).n,30);
  f.sqlite.close();
});
test('account deletion cascades social records and initialization remains additive and repeatable',async()=>{
  const f=await setup(),[,a,b]=f.users,p=await post(f,a);
  await call(f,'/friends/jogador-2',a,'POST');await call(f,'/posts/'+p.id+'/comments',b,'POST',{body:'Oi!'});
  await call(f,'/posts');await call(f,'/posts');
  f.sqlite.prepare('DELETE FROM users WHERE discord_id=?').run(a.id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_posts').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_post_comments').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_friendships').get().n,0);
  f.sqlite.close();
});
