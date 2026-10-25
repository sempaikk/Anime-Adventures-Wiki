import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';
import {glossary,normalText,prepareTranslation,transformSource} from '../src/lib/translation-structure.mjs';

export function htmlFiles(root) {
  return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(root,entry.name);
    if(entry.isDirectory())return ['en-us','pt-br'].includes(entry.name)?[]:htmlFiles(file);
    return file.endsWith('.html')?[file]:[];
  });
}

export function sourceGlossary(wiki, files=htmlFiles('dist')) {
  const names=new Set(['Anime Adventures','Adventures Wiki','Roblox','Gomu','Discord','YouTube','Secret','Mythic','Mythical','Legendary','Epic','Rare','Exclusive','Limited','Ground','Hill','Hybrid','Shiny','DPS','SPA','AoE','AOE','Robux','raid','raids','trait','traits','reroll','rerolls','pity']);
  for(const unit of wiki.units)for(const name of [unit.name,...unit.aliases]){names.add(name);names.add(name.toUpperCase())}
  for(const page of wiki.articles)if(['unit','item','trait','mode'].includes(page.kind))names.add(page.title);
  // Preserve named modes and locations exactly as recorded by the game's wiki.
  for(const name of ['Infinity Castle','Wall City','Massive Colossus'])names.add(name);
  const media=JSON.parse(fs.readFileSync('source/media-library.json'));
  for(const asset of Object.values(media)){
    const name=asset.filename?.match(/^Map\s*-\s*(.+)\.(?:png|webp|jpe?g)$/i)?.[1];
    if(name){names.add(name);names.add(name.replace(/\s*\([^)]*\)\s*$/,''))}
  }
  const traits=wiki.articles.find(page=>page.title==='Traits');
  if(traits&&fs.existsSync(`source/rendered/${traits.pageid}.json`)){
    const rendered=JSON.parse(fs.readFileSync(`source/rendered/${traits.pageid}.json`));
    if(rendered.parse.revid===traits.revision_id){
      const $=load(rendered.parse.text);
      $('font[size="5"]').each((_,node)=>{const name=normalText($(node).text());if(name.length>1&&name.length<40)names.add(name)});
    }
  }
  for(const name of [...names])if(name.length>3)names.add(name.toUpperCase());
  for(const source of wiki.sources.filter(source=>source.title.startsWith('Module:'))){
    const file=`source/raw/${source.pageid}.wiki`;
    if(!fs.existsSync(file))continue;
    const raw=fs.readFileSync(file,'utf8');
    for(const match of raw.matchAll(/\b(?:name|display_name|ability_name)\s*=\s*(['"])((?:\\.|(?!\1)[\s\S])*?)\1/g)){
      const name=match[2].replace(/\\(['"\\])/g,'$1');
      if(name.length>2 && name.length<100 && !/[\n<>]/.test(name) && !/^(Damage|Range|Cost|Name|Type|Level|Stats|Upgrades|Notes|Trivia|Health|Attack|Cooldown)$/i.test(name))names.add(name);
    }
  }
  for(const file of files){
    const $=load(fs.readFileSync(file,'utf8'));
    $('.wiki-content a[href^="http"]').each((_,node)=>{
      const text=normalText($(node).text());
      if(text.length>1&&text.length<100&&!/^(?:click\b|watch\b|see\b|check\b|here\b|this\b|source\b|image\b|video\b|read\b|link\b)/i.test(text))names.add(text);
    });
    if(/\/codes-\d+\//.test(file))$('.wiki-content tr').each((_,row)=>{
      const code=normalText($(row).children('td').first().text());
      if(/^[A-Za-z0-9_!?.-]{3,100}$/.test(code)&&!['expired','active','code','codes'].includes(code.toLowerCase()))names.add(code);
    });
  }
  return glossary([...names]);
}

export function sourceExcerpts(wiki) {
  return [...new Set(wiki.articles.filter(page=>page.excerpt && !/^(Esta página|Informações e referências|Consulte )/.test(page.excerpt)).map(page=>page.excerpt))];
}

if(process.argv[1]===new URL(import.meta.url).pathname){
  const work=process.env.AA_TRANSLATION_WORK_DIR||'.cache/translations';fs.mkdirSync(work,{recursive:true});
  const wiki=JSON.parse(fs.readFileSync('source/wiki.json'));
  const files=htmlFiles('dist');
  const reuse=process.argv.includes('--reuse-glossary')&&fs.existsSync('source/translations/glossary.json');
  const terms=reuse?glossary([...sourceGlossary(wiki,[]).names,...JSON.parse(fs.readFileSync('source/translations/glossary.json'))]):sourceGlossary(wiki,files),entries=new Map();
  const seen=new Set();
  const add=html=>{
    if(seen.has(html)||!/[\p{L}]{2}/u.test(html.replace(/<[^>]*>/g,'')))return;
    seen.add(html);const prepared=prepareTranslation(html,terms);if(prepared.key)entries.set(prepared.key,prepared.canonical);
  };
  for(const file of files){
    if(file.includes('/bot/'))continue;
    const $=load(fs.readFileSync(file,'utf8'));
    $('.wiki-content[lang="en"]').each((_,root)=>transformSource($,root,html=>{add(html)}));
  }
  for(const excerpt of sourceExcerpts(wiki)){const $=load('<p></p>',{},false);$('p').text(excerpt);add($('p').html())}
  const payload={version:1,source:'en',target:'pt-BR',entries:Object.fromEntries(entries)};
  fs.writeFileSync(work+'/articles-input.json',JSON.stringify(payload));
  fs.writeFileSync('source/translations/glossary.json',JSON.stringify([...terms.names].sort(),null,2)+'\n');
  console.log(JSON.stringify({fragments:entries.size,characters:[...entries.values()].reduce((sum,value)=>sum+value.length,0),largest:Math.max(...[...entries.values()].map(value=>value.length)),officialTerms:terms.names.size}));
}
