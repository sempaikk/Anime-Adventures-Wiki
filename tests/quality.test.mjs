import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {load} from 'cheerio';
import {fixture,publish,call,origin,req,article} from './helpers/community.mjs';
import {communityRequest} from '../worker/community.mjs';
import {cleanArticleNavigation} from '../src/lib/article-structure.mjs';
import {cleanArticle} from '../src/lib/sanitize.mjs';
import {prepareTranslation,restoreTranslation,glossary} from '../src/lib/translation-structure.mjs';
import {createTranslator} from '../src/lib/locales.mjs';

test('concurrent article comments reserve the final five-minute-window slot only once',async()=>{
 const f=fixture();await publish(f,f.users[1]);const time=Math.floor(Date.now()/1000),user=f.users[1];
 for(let i=0;i<7;i++)f.sqlite.prepare('INSERT INTO community_comments(id,article_slug,author_id,body,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(i.toString(16).padStart(32,'0'),article,user.id,'Existing comment',time,time);
 const prepare=f.env.DB.prepare.bind(f.env.DB);let reads=0,release;const gate=new Promise(r=>release=r);
 f.env.DB.prepare=sql=>{const statement=prepare(sql);if(sql==='SELECT COUNT(*) AS count FROM community_comments WHERE author_id=? AND created_at>?'){const read=statement.first.bind(statement);statement.first=async()=>{const value=await read();if(++reads===2)release();await gate;return value}}return statement};
 const results=await Promise.all([1,2].map(n=>call(f,'/comments',user,'POST',{article,body:'New comment '+n})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,429]);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM community_comments').get().n,8);f.sqlite.close();
});
test('reported photo content is available only to the moderator review endpoint',async()=>{
 const f=fixture(),[admin,owner,reporter]=f.users;await publish(f,owner);await publish(f,reporter);
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 const upload=await communityRequest(new Request(origin+'/api/community/media',{method:'POST',headers:{Origin:origin,Cookie:owner.cookie,'Content-Type':'image/png'},body:bytes}),f.env);const image=await upload.json();
 const post=await call(f,'/posts',owner,'POST',{body:'',image_id:image.id});assert.equal(post.status,201);
 await call(f,'/posts/'+post.data.post.id+'/report',reporter,'POST',{reason:'Please review the photo.'});
 assert.equal((await call(f,'/post-reports',reporter)).status,403);
 const reports=(await call(f,'/post-reports',admin)).data.reports;assert.equal(reports[0].image,'/api/community/media/'+image.id);
 assert.equal((await communityRequest(req('/media/'+image.id,admin),f.env)).status,200);f.sqlite.close();
});
test('upgrade identity survives translated headings without changing source values',()=>{
 const original=cleanArticle('<div class="mainStats"><div class="Stats-Box"><h3>Deployment - 1,700¥</h3><p>Damage: 800</p></div><div class="Stats-Box"><h3>Upgrade 1 - 2,500¥</h3></div></div>',()=>null);
 const prepared=prepareTranslation(original,glossary([]));const translated=restoreTranslation(prepared,prepared.canonical.replaceAll('Deployment','Posicionamento').replaceAll('Upgrade','Melhoria'));
 const $=load(translated);assert.equal($('.Stats-Box[data-upgrade-step]').length,2);assert.match($.text(),/1,700¥/);assert.match($.text(),/800/);
});
test('final article navigation removes dead controls without discarding their text or valid anchors',()=>{
 const $=load('<article class="wiki-content"><h2 id="valid">Section</h2><a href="#valid">Valid jump</a><a href="#missing">Infinity Castle</a><a class="info-icon" href="https://example.test"></a><a class="image" href="/empty"></a><a href="/cosmetic" title="Cosmetic image"><img alt="" src="/cosmetic.webp"></a></article>');cleanArticleNavigation($);
 assert.equal($('a[href="#valid"]').length,1);assert.equal($('a[href="#missing"]').length,0);assert.match($('.wiki-content').text(),/Infinity Castle/);assert.equal($('.info-icon').length,0);
 assert.equal($('a[href="/empty"]').length,0);assert.equal($('a[href="/cosmetic"]').attr('aria-label'),'Cosmetic image');
});
test('translated result counts use complete singular and plural messages',()=>{
 const messages={...JSON.parse(fs.readFileSync('source/translations/ui-en-US.json')),...JSON.parse(fs.readFileSync('source/translations/future-en-US.json'))},t=createTranslator(messages);
 for(const [input,expected] of [['1 personagem encontrado','1 character found'],['529 personagens encontrados','529 characters found'],['2 artigos encontrados','2 articles found'],['2 personagens na comparação.','2 characters in comparison.'],['Todos','All']])assert.equal(t(input),expected);
});
test('every map point has a Portuguese description preserving its recorded numbers',()=>{
 const wiki=JSON.parse(fs.readFileSync('source/wiki.json')),pt=JSON.parse(fs.readFileSync('source/translations/map-pt-BR.json'));
 for(const point of wiki.map.data.markers){const translated=pt[String(point.id)];assert.ok(translated,point.popup.title);assert.deepEqual(translated.match(/\d+/g)||[],point.popup.description.match(/\d+/g)||[])}
});
