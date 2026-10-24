import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {unitRarities, rarityFromIntro} from '../src/lib/unit-source.mjs';

test('exact source identities override stale category rarities across the catalog', () => {
  const rarities = unitRarities(fs.readFileSync('source/raw/369.wiki', 'utf8'));
  assert.equal(rarities.get('rokuhira'), 'Secret');
  assert.equal(rarities.get('rokuhira_evo'), 'Secret');
  assert.equal(rarities.get('speedwagon'), 'Epic');
  assert.ok(rarities.size > 450);
  const wiki = JSON.parse(fs.readFileSync('source/wiki.json'));
  for (const unit of wiki.units) {
    if (rarities.has(unit.id)) assert.equal(unit.rarity, rarities.get(unit.id), unit.id);
  }
});

test('article fallback requires an explicit declaration for the exact named form', () => {
  assert.equal(rarityFromIntro('Supreme Being', ['Supreme Being is a Secret unit based on Ainz.']), 'Secret');
  assert.equal(rarityFromIntro('Deer-tan', ['Deer-tan is an Exclusive unit.']), 'Exclusive');
  assert.equal(rarityFromIntro('Supreme Being', ['A different character is a Mythic unit.', 'Supreme Being can evolve.']), null);
  assert.equal(rarityFromIntro('Base Form', ['Base Form (Evolved) is a Secret unit.']), null);
  const wiki = JSON.parse(fs.readFileSync('source/wiki.json'));
  assert.equal(wiki.units.find(unit => unit.id === 'ainz').rarity, 'Secret');
  assert.equal(wiki.units.find(unit => unit.id === 'nokotan').rarity, 'Exclusive');
});

test('nested fields, mismatched identities and unknown rarities cannot become units', () => {
  const text = `return {\n\ta = { id='a', rarity='Secret', upgrade={{rarity='Rare'}} },\n\tb = { id='different', rarity='Epic' },\n\tc = { id='c', rarity='invented' },\n}`;
  assert.deepEqual([...unitRarities(text)], [['a', 'Secret']]);
});
