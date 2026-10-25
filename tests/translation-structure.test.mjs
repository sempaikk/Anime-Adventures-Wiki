import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import fs from 'node:fs';
import {glossary,prepareTranslation,restoreTranslation,validateCanonical,transformSource} from '../src/lib/translation-structure.mjs';
const terms=glossary(['Vengeful Swordsman (Sky Reaver)','Secret','Roblox']);
test('game mode names remain intact in translated source badges',()=>{
  const prepared=prepareTranslation('<b>Infinity Mansion Meta Unit</b>',terms);
  assert.equal(restoreTranslation(prepared,''),'<b>Unidade meta em Infinity Mansion</b>');
});
test('the recorded game glossary protects modes, map names and trait names',()=>{
  const recorded=glossary(JSON.parse(fs.readFileSync('source/translations/glossary.json')));
  for(const name of ['Infinity Mansion','Infinity Castle','Planet Namak','Hero City','Unique','Divine','Godspeed','Range']){
    assert.ok(recorded.names.has(name),name);
    assert.equal(prepareTranslation(name,recorded).literal,name);
  }
});
test('public translation preserves exact source markup, numbers, names and images',()=>{
  const html='<b style="color:red">Vengeful Swordsman (Sky Reaver)</b> is a Secret unit. Costs <a href="#x" title="source">2,000¥</a>. <img src="/art/a.webp" alt="source">';
  const prepared=prepareTranslation(html,terms);
  const result=restoreTranslation(prepared,prepared.canonical.replace(' is a ',' é uma unidade ').replace(' unit. Costs ',' . Custa '));
  const $=load(result,{},false);
  assert.equal($('b').attr('style'),'color:red');assert.equal($('a').attr('href'),'#x');
  assert.equal($('a').text(),'2,000¥');assert.equal($('img').attr('src'),'/art/a.webp');assert.match($.root().text(),/Vengeful Swordsman \(Sky Reaver\)/);
});
test('translation rejects missing protected text, injection, changed shape and invented numbers',()=>{
  const p=prepareTranslation('Roblox has <b>20</b> units.',terms);
  for(const bad of [p.canonical.replace(/ZXQNAME\d+QXZ/,''),p.canonical+' 99',p.canonical.replace('<b ','<b onclick="x" '),p.canonical.replaceAll('b ','i ').replace('</b>','</i>'),p.canonical.replace(/(ZXQNAME\d+QXZ)/,'<!--$1-->')])assert.throws(()=>validateCanonical(p.canonical,bad));
});
test('content groups respect widgets and source block boundaries',()=>{
  const $=load('<article><p>First <b>sentence</b>.</p><div class="section-share">Own UI</div><nav><button>Original Skin</button><button>Shiny Skin</button></nav><pre>Code</pre></article>',{},false),groups=[];
  transformSource($,$('article')[0],html=>{groups.push(html)});
  assert.ok(groups.includes('First <b>sentence</b>.'));assert.ok(groups.includes('Original Skin'));assert.ok(groups.includes('Shiny Skin'));
  assert.ok(!groups.some(text=>text.includes('Own UI')||text.includes('Code')));
});
test('UI translation protects template slots and contact addresses',()=>{
  const p=prepareTranslation('Mensagem de {0} para estrmozica@gmail.com.',terms,{headings:false});
  assert.ok(!p.canonical.includes('estrmozica@gmail.com'));assert.ok(!p.canonical.includes('{0}'));
  assert.equal(restoreTranslation(p,p.canonical.replace('Mensagem de ','Message from ').replace(' para ',' to ')),'Message from {0} to estrmozica@gmail.com.');
});
