import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,call,publish} from './helpers/community.mjs';
const article='iron-knight-arsenal-2259';
async function setup(){const f=fixture();await publish(f,f.users[1],'jogador-1');return f}
test('post topics use known articles, filter the feed and survive text edits',async()=>{
 const f=await setup(),u=f.users[1];
 const created=await call(f,'/posts',u,'POST',{body:'Dica sobre esta unidade.',article_slug:article});
 assert.equal(created.status,201);const post=created.data.post;
 assert.equal(post.article.slug,article);assert.equal(post.article.url,`/artigo/${article}/`);
 await call(f,'/posts',u,'POST',{body:'Publicação geral.'});
 assert.deepEqual((await call(f,'/posts?article='+article)).data.posts.map(p=>p.id),[post.id]);
 let edited=await call(f,'/posts/'+post.id,u,'PATCH',{body:'Dica revisada.'});assert.equal(edited.data.post.article.slug,article);
 edited=await call(f,'/posts/'+post.id,u,'PATCH',{body:'Não deve salvar.',article_slug:'__proto__'});assert.equal(edited.status,400);
 assert.equal((await call(f,'/posts?article='+article)).data.posts[0].body,'Dica revisada.');
 assert.equal((await call(f,'/posts',u,'POST',{body:'Inválido.',article_slug:'missing-article'})).status,400);
 assert.equal((await call(f,'/posts?article=missing-article')).status,400);
 assert.equal((await call(f,'/posts')).data.posts.length,2);
 edited=await call(f,'/posts/'+post.id,u,'PATCH',{body:'Publicação sem assunto.',article_slug:null});assert.equal(edited.data.post.article,null);
 assert.equal((await call(f,'/posts?article='+article)).data.posts.length,0);f.sqlite.close();
});
test('topic feeds preserve privacy, deletion and authentication for friends',async()=>{
 const f=await setup(),u=f.users[1];
 const post=(await call(f,'/posts',u,'POST',{body:'Uma dica.',article_slug:article})).data.post;
 assert.equal((await call(f,'/posts?article='+article+'&feed=friends')).status,401);
 await f.env.DB.prepare('UPDATE community_profiles SET published=0 WHERE owner_id=?').bind(u.id).run();
 assert.equal((await call(f,'/posts?article='+article)).data.posts.length,0);
 await f.env.DB.prepare('UPDATE community_profiles SET published=1 WHERE owner_id=?').bind(u.id).run();
 await call(f,'/posts/'+post.id,u,'DELETE');assert.equal((await call(f,'/posts?article='+article)).data.posts.length,0);f.sqlite.close();
});
test('post creation and topic association roll back together and obey the existing quota',async()=>{
 const f=await setup(),u=f.users[1];
 await call(f,'/posts');
 f.sqlite.exec("CREATE TRIGGER reject_topic BEFORE INSERT ON community_post_topics BEGIN SELECT RAISE(ABORT,'simulated storage failure'); END");
 await assert.rejects(()=>call(f,'/posts',u,'POST',{body:'Falha isolada.',article_slug:article}),/simulated storage failure/);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_posts').get().n,0);
 f.sqlite.exec('DROP TRIGGER reject_topic');
 for(let i=0;i<10;i++)assert.equal((await call(f,'/posts',u,'POST',{body:'Dica '+i,article_slug:article})).status,201);
 assert.equal((await call(f,'/posts',u,'POST',{body:'Acima do limite.',article_slug:article})).status,429);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_post_topics').get().n,10);f.sqlite.close();
});
test('decorative scene reservations are distinct, attributed and backed by original files',()=>{
 const {scenes}=JSON.parse(fs.readFileSync('source/art-direction.json'));
 const used=new Set();for(const scene of Object.values(scenes)){
  assert.ok(!used.has(scene.image),scene.name);used.add(scene.image);
  assert.ok(fs.existsSync('public'+scene.image),scene.image);assert.match(scene.source,/animeadventures\.fandom\.com\/wiki\/File:/);
  assert.ok(scene.width>900&&scene.height>500);
 }
});
test('topic migration can be reapplied over the existing social schema without changing posts',()=>{
 const f=fixture();
 for(const file of ['0002_community','0003_social'])f.sqlite.exec(fs.readFileSync('migrations/'+file+'.sql','utf8'));
 f.sqlite.prepare('INSERT INTO community_posts(id,author_id,body,created_at,updated_at) VALUES(?,?,?,?,?)').run('a'.repeat(32),f.users[1].id,'Conteúdo existente.',1,1);
 const before=f.sqlite.prepare('SELECT rowid,* FROM community_posts').all();
 for(let i=0;i<2;i++)f.sqlite.exec(fs.readFileSync('migrations/0004_post_topics.sql','utf8'));
 assert.deepEqual(f.sqlite.prepare('SELECT rowid,* FROM community_posts').all(),before);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_post_topics').get().n,0);f.sqlite.close();
});
