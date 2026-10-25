import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pruneAssets} from '../scripts/prune_assets.mjs';
import {maintainStorage} from '../worker/maintenance.mjs';

test('publication cleanup preserves lazy images referenced only by JSON, scripts, CSS or Worker and leaves the archive intact', () => {
  const task=fs.mkdtempSync(path.join(os.tmpdir(),'wiki-storage-'));
  try {
    const dist=path.join(task,'dist'),worker=path.join(task,'worker'),source=path.join(task,'source');
    for(const dir of [path.join(dist,'art'),worker,source])fs.mkdirSync(dir,{recursive:true});
    for(const file of ['document','lazy','script','style','worker','unused'])fs.writeFileSync(path.join(dist,'art',file+'.webp'),file);
    fs.writeFileSync(path.join(dist,'index.html'),'<img src="/art/document.webp">');
    fs.writeFileSync(path.join(dist,'units.json'),'{"image":"/art/lazy.webp"}');
    fs.writeFileSync(path.join(dist,'bundle.js'),'const portrait="/art/script.webp"');
    fs.writeFileSync(path.join(dist,'style.css'),'body{background:url(/art/style.webp)}');
    fs.writeFileSync(path.join(worker,'index.mjs'),'const cover="/art/worker.webp"');
    fs.writeFileSync(path.join(source,'unused.webp'),'original');
    const result=pruneAssets(dist,[worker]);
    assert.deepEqual(result,{removed:1,bytes:6,retained:5});
    assert.equal(fs.existsSync(path.join(dist,'art/unused.webp')),false);
    assert.equal(fs.readFileSync(path.join(source,'unused.webp'),'utf8'),'original');
  } finally {fs.rmSync(task,{recursive:true,force:true});}
});

test('daily cleanup expires only invalid sessions and abandoned images, preserving private profiles, hidden comments and drafts', async () => {
  const db=new DatabaseSync(':memory:');
  db.exec(fs.readFileSync('migrations/0001_accounts.sql','utf8'));
  db.exec(fs.readFileSync('migrations/0002_community.sql','utf8'));
  const now=Math.floor(Date.now()/1000);
  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('user','Name','avatar',now);
  for(const [id,expiry] of [['active',now+600],['expired',now-1]])db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(id,'user',expiry);
  for(const [id,created] of [['private',now-90000],['hidden',now-90000],['draft',now-60],['abandoned',now-90000]])db.prepare('INSERT INTO community_media VALUES(?,?,?,?,?,?,?)').run(id,'user',new Uint8Array([1]),'image/webp',1,1,created);
  db.prepare('INSERT INTO community_profiles(owner_id,public_id,handle,name,avatar_id,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run('user','public','private-user','Name','private',0,now,now);
  db.prepare("INSERT INTO community_comments(id,article_slug,author_id,body,image_id,moderation,created_at,updated_at) VALUES(?,?,?,?,?,'hidden',?,?)").run('comment','traits-165','user','Text','hidden',now,now);
  const env={DB:{prepare(sql){
    let values=[];
    return {
      bind(...v){values=v;return this},
      async run(){return db.prepare(sql).run(...values)},
      async first(){return db.prepare(sql).get(...values)},
    };
  }}};
  await maintainStorage(env);
  assert.deepEqual(db.prepare('SELECT token_hash FROM sessions').all().map(v=>v.token_hash),['active']);
  assert.deepEqual(db.prepare('SELECT id FROM community_media ORDER BY id').all().map(v=>v.id),['draft','hidden','private']);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM community_comments').get().count,1);
  await maintainStorage(env);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM community_media').get().count,3);
  db.close();
});
