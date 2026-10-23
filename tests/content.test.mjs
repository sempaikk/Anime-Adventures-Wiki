import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { cleanArticle } from '../src/lib/sanitize.mjs';

const resolve=t=>t==='Traits'?{slug:'traits-165'}:null;
test('community source cannot inject active script, handlers, styles or frames',()=>{
  const html=cleanArticle('<script>alert(1)</script><iframe src="https://evil.test"></iframe><p onclick="alert(1)" style="position:fixed">Reference</p><a href="javascript:alert(1)">Unsafe</a>',resolve);
  assert.doesNotMatch(html,/script|iframe|onclick|position:fixed|javascript:/i);
  assert.match(html,/Reference/);
});
test('source tables, text and numbers survive cleanup',()=>{
  const html=cleanArticle('<h2 id="Stats">Stats</h2><table><tr><th>Damage</th><td>800 × 1.4</td></tr></table><p>Bleed is applied over 5 seconds.</p>',resolve);
  assert.match(html,/<table>/);assert.match(html,/800 × 1.4/);assert.match(html,/5 seconds/);assert.match(html,/id="Stats"/);
});
test('article links stay local and credits remain safe external links',()=>{
  const html=cleanArticle('<a href="/wiki/Traits#Divine">Traits</a><a href="https://example.com/info">Credits</a>',resolve);
  assert.match(html,/href="\/artigo\/traits-165\/#Divine"/);
  assert.match(html,/rel="noopener noreferrer"/);
});
test('lazy game artwork loads while website icons and foreign trackers are removed',()=>{
  const html=cleanArticle('<img data-src="https://static.wikia.nocookie.net/animeadventures/images/a/aa/Agony.png" src="data:image/gif;base64,AA" alt="Agony"><img src="https://evil.test/track.png"><img src="https://static.wikia.nocookie.net/animeadventures/images/a/ab/GUI_Tier-List_icon.png">',resolve);
  assert.match(html,/Agony.png/);assert.doesNotMatch(html,/data:image|evil.test|GUI_Tier/);
});
test('every original text source matches its recorded digest',()=>{
  const wiki=JSON.parse(fs.readFileSync('source/wiki.json','utf8'));
  assert.equal(wiki.articles.length,661);
  const paths=new Set();
  for(const page of wiki.sources){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`source/raw/${page.pageid}.wiki`)).digest('hex'),page.sha256,page.title);
    assert(!paths.has(page.slug));paths.add(page.slug);
  }
});
test('each imported presentation identifies the exact original revision',()=>{
  const wiki=JSON.parse(fs.readFileSync('source/wiki.json','utf8'));
  for(const page of wiki.articles){
    const path=`source/rendered/${page.pageid}.json`;
    if(fs.existsSync(path))assert.equal(JSON.parse(fs.readFileSync(path,'utf8')).parse.revid,page.revision_id,page.title);
  }
});
