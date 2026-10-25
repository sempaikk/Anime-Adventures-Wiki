import {load} from 'cheerio';
import {createHash} from 'node:crypto';

const marker = 'data-aw-translate-node';
const tokenPattern = /ZXQ(?:OPAQUE|NAME|NUM)\d+QXZ/g;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const normalText = value => value.replace(/\s+/g,' ').trim();
const manual = {
  Stats:'Atributos',Statistics:'Atributos',Overview:'Visão geral',Obtaining:'Como obter',
  Obtainment:'Como obter',Evolution:'Evolução',Evolving:'Evolução',Evolutions:'Evoluções',
  Trivia:'Curiosidades',Notes:'Notas',Description:'Descrição',Navigation:'Navegação',
  Damage:'Dano',Range:'Alcance',Cost:'Custo',Name:'Nome',Type:'Tipo',Level:'Nível',
  Rarity:'Raridade',Health:'Vida',Duration:'Duração',Cooldown:'Tempo de recarga',
  'Tower Type':'Posicionamento','Damage Type':'Tipo de dano','Deployment Cost':'Custo de posicionamento',
  'Total Cost':'Custo total','Total Damage':'Dano total','Attack Cooldown':'Intervalo de ataque',
  'Attack Speed':'Intervalo de ataque','Attack Type':'Tipo de ataque','Placement Limit':'Limite de unidades',
  'Upgrade Levels':'Etapas de upgrade','Original Skin':'Skin original','Shiny Skin':'Skin Shiny',
  'Passive':'Passiva','Passives':'Passivas','Abilities':'Habilidades','Ability':'Habilidade',
  'Active Ability':'Habilidade ativa','Special Ability':'Habilidade especial',
  'Critical Chance':'Chance de crítico','Critical Damage':'Dano crítico',
  'Crit Chance':'Chance de crítico','Crit Damage':'Dano crítico','Required Level':'Nível necessário',
  'Obtained by':'Como obter','Recommended':'Recomendado','Recommendations':'Recomendações',
  'Limited Unit':'Unidade limitada','Meta Unit':'Unidade meta',
  'Infinity Mansion Meta Unit':'Unidade meta em Infinity Mansion',
  'Infinity Castle Meta Unit':'Unidade meta em Infinity Castle',
};
const blocks = new Set('address article aside blockquote center dd div dl dt figcaption figure footer form button h1 h2 h3 h4 h5 h6 header hr li main nav ol p section table tbody td th thead tr ul'.split(' '));
const untouched = 'script,style,pre,code,kbd,samp,svg,math,video,audio,iframe,input,select,textarea,[translate="no"],[data-no-translate],[data-ui],.unit-reference-card,.section-share,.empty-state';

export function glossary(names) {
  const terms = [...new Set(names.map(normalText).filter(value => value.length > 1))];
  const sorted = terms.sort((a,b)=>b.length-a.length);
  const pattern = sorted.map(value => escape(value).replace(/\s+/g,'\\s+')).join('|');
  const namesPattern = `(?<![\\p{L}\\p{N}_])(?:${pattern || '(?!)'})(?![\\p{L}\\p{N}_])`;
  const numbersPattern = '[+−-]?(?:[$¥€]\\s*)?\\d+(?:[.,:/]\\d+)*(?:\\s*[×xX%¥$°])?';
  const addresses='(?:https?:\\/\\/[^\\s<>]+|[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})';
  return {names:new Set(terms), expression:new RegExp(`(?<existing>ZXQ(?:OPAQUE|NAME|NUM)\\d+QXZ)|(?<slot>\\{\\d+\\})|(?<address>${addresses})|(?<name>${namesPattern})|(?<number>${numbersPattern})`,'gu')};
}

function textNodes(root) {
  const result=[];
  const visit=node=>{if(node.type==='text')result.push(node);else for(const child of node.children || [])visit(child)};
  visit(root);return result;
}

export function prepareTranslation(html, terms, {headings=true}={}) {
  const $=load(html,{},false), originalText=$.root().text(), nodes=textNodes($.root()[0]);
  const visible=nodes.filter(node=>normalText(node.data));
  const heading=normalText(originalText), plainHeading=heading.replace(/[:：]$/,'');
  // A known game name wins over an ambiguous ordinary word (e.g. Range).
  if(terms.names.has(heading))
    return {literal:html,original:html,originalText};
  if(headings && visible.length===1 && manual[plainHeading]) {
    const node=visible[0], lead=node.data.match(/^\s*/)[0],tail=node.data.match(/\s*$/)[0];
    node.data=lead+manual[plainHeading]+(heading.endsWith(':')?':':'')+tail;
    return {literal:$.root().html(),original:html,originalText};
  }
  const tokens=[], attributes=[];
  const token=(kind,value)=>{const key=`ZXQ${kind}${tokens.length}QXZ`;tokens.push({key,kind,value});return key};
  const protect=node=>{
    if(node.type==='comment'){ $(node).replaceWith(token('OPAQUE',$.html(node)));return; }
    if(node.type!=='tag')return;
    const element=$(node), value=normalText(element.text());
    if(element.is(untouched) || element.is('img,br') || (value && terms.names.has(value))) {
      element.replaceWith(token('OPAQUE',$.html(node)));return;
    }
    const id=`n${attributes.length}`;
    attributes.push({id,tag:node.tagName,attributes:{...node.attribs}});
    node.attribs={[marker]:id};
    for(const child of [...node.children])protect(child);
  };
  for(const child of [...$.root()[0].children])protect(child);
  const remaining=textNodes($.root()[0]);let cursor=0;
  const positions=remaining.map(node=>{const start=cursor;cursor+=node.data.length;return {node,start,end:cursor}});
  const stream=remaining.map(node=>node.data).join(''), matches=[...stream.matchAll(terms.expression)].filter(match=>!match.groups.existing);
  for(const {node,start,end} of positions){
    let from=0,output='';
    for(const match of matches){
      const left=Math.max(start,match.index),right=Math.min(end,match.index+match[0].length);
      if(left>=right)continue;
      output+=node.data.slice(from,left-start)+token(match.groups.number?'NUM':'NAME',node.data.slice(left-start,right-start));from=right-start;
    }
    node.data=output+node.data.slice(from);
  }
  const canonical=$.root().html();
  const residual=$.root().text().replace(tokenPattern,'').replace(/[^\p{L}]/gu,'');
  if(residual.length<2)return {literal:html,original:html,originalText};
  const nameSignature = [...originalText.matchAll(terms.expression)].filter(match=>match.groups.name).map(match=>normalText(match[0])).sort();
  return {key:createHash('sha256').update(canonical).digest('hex'),canonical,tokens,attributes,original:html,originalText,nameSignature,nameExpression:terms.expression};
}

function signature(html) {
  const $=load(html,{},false), records=[];
  const comments=node=>{if(node.type==='comment')throw Error('Translation introduced a comment.');for(const child of node.children||[])comments(child)};
  comments($.root()[0]);
  $('*').each((_,node)=>{
    const attrs=Object.keys(node.attribs);
    if(attrs.length!==1 || !node.attribs[marker])throw Error('Translation introduced an unrecognized element or attribute.');
    records.push({id:node.attribs[marker],tag:node.tagName,parent:$(node).parent().attr(marker)||null});
  });
  return records.sort((a,b)=>a.id.localeCompare(b.id));
}

export function validateCanonical(original, translated) {
  if(typeof translated!=='string' || !translated.trim())throw Error('Empty translation.');
  if(JSON.stringify(signature(original))!==JSON.stringify(signature(translated)))throw Error('Translation changed the document structure.');
  const expected=(original.match(tokenPattern)||[]).sort(),actual=(translated.match(tokenPattern)||[]).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('Translation lost or duplicated a protected name, number or image.');
  const $=load(translated,{},false);
  if(/\d/.test($.root().text().replace(tokenPattern,'')))throw Error('Translation introduced an unprotected number.');
}

export function restoreTranslation(prepared, translated) {
  if(prepared.literal!==undefined)return prepared.literal;
  validateCanonical(prepared.canonical,translated);
  const $=load(translated,{},false),byId=new Map(prepared.attributes.map(record=>[record.id,record]));
  $('*').each((_,node)=>{node.attribs={...byId.get(node.attribs[marker]).attributes}});
  const values=new Map(prepared.tokens.map(record=>[record.key,record]));
  const result=$.root().html().replace(tokenPattern,key=>{
    const record=values.get(key);
    return record.kind==='OPAQUE'?record.value:record.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  });
  if(/ZXQ(?:OPAQUE|NAME|NUM)\d+QXZ/.test(result))throw Error('Unrestored translation token.');
  const before=prepared.originalText.match(/\d+(?:[.,:/]\d+)*/g)||[],after=load(result,{},false).root().text().match(/\d+(?:[.,:/]\d+)*/g)||[];
  if(JSON.stringify(before.sort())!==JSON.stringify(after.sort()))throw Error('Translation changed a number.');
  const names=[...load(result,{},false).root().text().matchAll(prepared.nameExpression)].filter(match=>match.groups.name).map(match=>normalText(match[0])).sort();
  // A translated ordinary word can coincide with a glossary entry (e.g. Items).
  // Every original occurrence must survive; protected-token equality above is
  // what prevents the provider from changing, dropping or duplicating names.
  const counts=values=>values.reduce((map,name)=>map.set(name,(map.get(name)||0)+1),new Map());
  const present=counts(names);
  for(const [name,count] of counts(prepared.nameSignature))if((present.get(name)||0)<count)throw Error('Translation changed an official name.');
  return result;
}

// Translate continuous phrasing content together, preserving every block and
// widget boundary. This gives the provider sentences rather than isolated words.
export function transformSource($, root, transform) {
  function visit(parent) {
    if(parent.type==='tag' && $(parent).is(untouched))return;
    let group=[];
    function flush(){
      if(!group.length)return;
      const original=group.map(node=>$.html(node)).join(''), replacement=transform(original);
      if(replacement!==undefined && replacement!==original){$(group[0]).replaceWith(replacement);for(const node of group.slice(1))$(node).remove()}
      group=[];
    }
    for(const node of [...parent.children || []]){
      const isBlock=node.type==='tag' && (blocks.has(node.tagName)||node.tagName==='br'||$(node).is(untouched)||$(node).find([...blocks].join(',')).length);
      if(isBlock){flush();visit(node)}else group.push(node);
    }
    flush();
  }
  visit(root);
}
