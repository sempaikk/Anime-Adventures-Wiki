import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {splitPrimaryInfobox,markUnavailableFacts} from '../src/lib/wiki-presentation.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('malformed source infobox values are marked missing without guessing game data',()=>{
  const html='<aside class="portable-infobox"><div class="pi-data"><h3 class="pi-data-label">Total Cost</h3><div class="pi-data-value">true¥</div></div><div class="pi-data"><div class="pi-data-value">2,000¥</div></div></aside><p>true</p>';
  const $=load(markUnavailableFacts(html),{},false);
  assert.equal($('.pi-data-value').first().text(),'Não informado nesta revisão da fonte.');
  assert.equal($('.pi-data-value').last().text(),'2,000¥');assert.equal($('p').text(),'true');
});

test('original game navigation icons retain their recorded bytes and stylesheet references',()=>{
  const source=JSON.parse(fs.readFileSync('source/wiki-navigation.json'));
  const css=fs.readFileSync(source.reference);
  assert.equal(digest(css),source.sha256);
  assert.equal(source.icons.length,13);
  assert.equal(new Set(source.icons.map(icon=>icon.key)).size,13);
  for(const icon of source.icons){
    assert.equal(digest(fs.readFileSync('public'+icon.url)),icon.sha256,icon.key);
    assert.ok(icon.width>0&&icon.height>0);
    assert.ok(css.toString().includes(icon.selector));
    assert.ok(css.toString().includes(icon.source_url.split('/revision/')[0]));
  }
});

test('moving the real primary infobox preserves all source text, images, anchors and upgrade panels',()=>{
  const html=JSON.parse(fs.readFileSync('source/rendered/2259.json')).parse.text;
  const before=load(html,{},false),parts=splitPrimaryInfobox(html),after=load(parts.html+parts.infobox,{},false);
  assert.ok(parts.infobox.includes('portable-infobox'));
  const textNodes=$=>$('*').contents().toArray().filter(node=>node.type==='text').map(node=>node.data.trim()).filter(Boolean).sort();
  assert.deepEqual(textNodes(after),textNodes(before));
  assert.deepEqual(after('img').toArray().map(node=>after(node).attr('src')).sort(),before('img').toArray().map(node=>before(node).attr('src')).sort());
  assert.deepEqual(after('[id]').toArray().map(node=>after(node).attr('id')).sort(),before('[id]').toArray().map(node=>before(node).attr('id')).sort());
  assert.equal(after('.Stats-Box').length,before('.Stats-Box').length);
  assert.equal(load(parts.html)('.mw-parser-output > .portable-infobox').length,0);
});
