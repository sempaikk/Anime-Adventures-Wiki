// A small structural reader, never a Lua interpreter. Whitespace, comments and
// quoted braces must not change which record a field belongs to.
function luaTokens(source) {
  const result = [];
  let index = 0;
  const longString = (start) => {
    const open = source.slice(start).match(/^\[(=*)\[/);
    if (!open) return null;
    const end = source.indexOf(']' + open[1] + ']', start + open[0].length);
    if (end < 0) throw Error('Unterminated Lua long string.');
    return {value: source.slice(start + open[0].length, end), end: end + open[1].length + 2};
  };
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) { index++; continue; }
    if (source.startsWith('--', index)) {
      const block = longString(index + 2);
      index = block ? block.end : (source.indexOf('\n', index) < 0 ? source.length : source.indexOf('\n', index));
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '', closed = false;
      index++;
      while (index < source.length) {
        const next = source[index++];
        if (next === quote) { closed = true; break; }
        if (next === '\\') {
          const escaped = source[index++];
          value += ({n:'\n',r:'\r',t:'\t'})[escaped] ?? escaped;
        } else value += next;
      }
      if (!closed) throw Error('Unterminated Lua quoted string.');
      result.push({type:'string',value});
      continue;
    }
    const block = char === '[' ? longString(index) : null;
    if (block) { result.push({type:'string',value:block.value}); index = block.end; continue; }
    const name = source.slice(index).match(/^[A-Za-z_]\w*/)?.[0];
    if (name) { result.push({type:'name',value:name}); index += name.length; continue; }
    result.push({type:'symbol',value:char});
    index++;
  }
  return result;
}

function keyAt(tokens, index) {
  if (tokens[index]?.type === 'name') return {name:tokens[index].value, end:index + 1};
  if (tokens[index]?.value === '[' && tokens[index + 1]?.type === 'string' && tokens[index + 2]?.value === ']')
    return {name:tokens[index + 1].value,end:index + 3};
  return null;
}

export function unitRecords(source) {
  const tokens = luaTokens(source), result = new Map();
  const start = tokens.findIndex((token,index) => token.value === 'return' && tokens[index + 1]?.value === '{');
  if (start < 0 || tokens.some(token=>token.type==='name' && token.value==='function')) throw Error('UnitData must return a literal table without functions.');
  let depth = 1;
  for (let index = start + 2; index < tokens.length; index++) {
    const token = tokens[index];
    const key = depth === 1 ? keyAt(tokens,index) : null;
    if (key && tokens[key.end]?.value === '=' && tokens[key.end + 1]?.value === '{') {
      const fields = Object.create(null);
      let innerDepth = 1, next = key.end + 2;
      for (; next < tokens.length && innerDepth; next++) {
        const field = innerDepth === 1 ? keyAt(tokens,next) : null;
        if (field && tokens[field.end]?.value === '=' && tokens[field.end + 1]?.type === 'string' && [',',';','}'].includes(tokens[field.end + 2]?.value))
          fields[field.name] = tokens[field.end + 1].value;
        if (tokens[next].value === '{' && tokens[next].type === 'symbol') innerDepth++;
        if (tokens[next].value === '}' && tokens[next].type === 'symbol') innerDepth--;
      }
      if (innerDepth) throw Error('Unterminated unit record.');
      if (fields.id === key.name) result.set(key.name,fields);
      index = next - 1;
      continue;
    }
    if (token.value === '{' && token.type === 'symbol') depth++;
    if (token.value === '}' && token.type === 'symbol') depth--;
    if (!depth) break;
  }
  return result;
}

export function unitRarities(source) {
  const allowed = new Set(['Rare','Epic','Legendary','Mythic','Secret','Exclusive']);
  return new Map([...unitRecords(source)].filter(([,record]) => allowed.has(record.rarity)).map(([id,record]) => [id,record.rarity]));
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
