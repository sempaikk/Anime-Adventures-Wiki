// Read only the named unit records in the preserved UnitData module. Never execute Lua.
export function unitRarities(source) {
  const starts = [...source.matchAll(/^\t([A-Za-z_]\w*)\s*=\s*\{/gm)];
  const result = new Map();
  const allowed = new Set(['Rare', 'Epic', 'Legendary', 'Mythic', 'Secret', 'Exclusive']);
  for (let index = 0; index < starts.length; index++) {
    const entry = starts[index];
    const body = source.slice(entry.index + entry[0].length, starts[index + 1]?.index ?? source.length);
    const id = body.match(/\bid\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const rarity = body.match(/\brarity\s*=\s*['"]([^'"]+)['"]/)?.[1];
    if (id === entry[1] && allowed.has(rarity)) result.set(id, rarity);
  }
  return result;
}

// A fallback requires the article to explicitly identify this exact form.
export function rarityFromIntro(name, paragraphs) {
  for (const paragraph of paragraphs) {
    const value = paragraph.replace(/\s+/g, ' ').trim();
    if (!value.toLowerCase().startsWith((name + ' is ').toLowerCase())) continue;
    const rarity = value.slice(name.length).match(/^ is (?:a|an) (Secret|Mythic(?:al)?|Legendary|Epic|Rare|Exclusive)\b/i)?.[1];
    if (rarity) return /^mythic/i.test(rarity) ? 'Mythic' : rarity[0].toUpperCase() + rarity.slice(1).toLowerCase();
  }
  return null;
}
