// Offline variants: no translation provider is contacted by builds or visitors.
import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';
import {htmlFiles,sourceExcerpts} from './translation-corpus.mjs';
import {glossary,prepareTranslation,restoreTranslation,transformSource,normalText} from '../src/lib/translation-structure.mjs';
import {createTranslator,localizedPath,localePrefix} from '../src/lib/locales.mjs';

if(process.env.SITE_BASE&&!['','/'].includes(process.env.SITE_BASE)){console.log('Portable base preview: retaining the original single-language routes.');process.exit(0)}
const wiki=JSON.parse(fs.readFileSync('source/wiki.json'));
const messages={...JSON.parse(fs.readFileSync('source/translations/ui-en-US.json')),...JSON.parse(fs.readFileSync('source/translations/future-en-US.json'))};
const cache=JSON.parse(fs.readFileSync('source/translations/articles-pt-BR.json')).entries;
const terms=glossary(JSON.parse(fs.readFileSync('source/translations/glossary.json')));
const english=createTranslator(messages),excerpts=new Map(),missing=new Set(),memo=new Map();
const origin='https://www.adventureswiki.workers.dev';
const attrs=['aria-label','aria-description','title','placeholder','alt'];
const sourceUI='.unit-reference-card,.section-share,.article-tab-nav button,.empty-state,[data-ui]';
const ignore='script,style,pre,code,kbd,samp,textarea,[data-no-translate],[translate="no"]';
function portuguese(html){
  if(memo.has(html))return memo.get(html);
  if(!/[\p{L}]{2}/u.test(html.replace(/<[^>]*>/g,'')))return html;
  const prepared=prepareTranslation(html,terms);
  if(prepared.literal!==undefined){memo.set(html,prepared.literal);return prepared.literal}
  const translated=cache[prepared.key];
  if(!translated){missing.add(prepared.key);return html}
  const result=restoreTranslation(prepared,translated);memo.set(html,result);return result;
}
for(const excerpt of sourceExcerpts(wiki)){
  const $=load('<p></p>',{},false);$('p').text(excerpt);
  excerpts.set(normalText(excerpt),load(portuguese($('p').html()),{},false).root().text());
}
function translateUI($,locale){
  function walk(node){
    if(node.type==='text'){
      const parent=$(node).parent();
      if(parent.closest(ignore).length)return;
      if(parent.closest('.wiki-content').length&&!parent.closest(sourceUI).length)return;
      if(locale==='pt-BR'){
        const original=normalText(node.data),replacement=excerpts.get(original);
        if(replacement)node.data=node.data.replace(original,replacement);
      } else node.data=english(node.data);
      return;
    }
    // Translate control attributes, while preserving authored textarea values.
    if(node.type==='tag'&&$(node).is(ignore)&&!$(node).is('textarea'))return;
    if(node.type==='tag'&&$(node).is('.wiki-content')){
      $(node).find(sourceUI).each((_,control)=>walk(control));return;
    }
    if(node.type==='tag'&&(!$(node).closest('.wiki-content').length||$(node).closest(sourceUI).length))for(const attr of attrs){
      const value=$(node).attr(attr);if(value&&locale==='en-US')$(node).attr(attr,english(value));
    }
    for(const child of node.children||[])walk(child);
  }
  walk($.root()[0]);
  const description=$('meta[name="description"]');
  const value=description.attr('content');
  if(value)description.attr('content',locale==='pt-BR'?excerpts.get(normalText(value))||value:english(value));
}
function links($,locale,rootPath){
  $('a[href],form[action]').each((_,node)=>{
    const el=$(node),key=el.is('a')?'href':'action',value=el.attr(key);
    if(!value||value.startsWith('#'))return;
    const url=new URL(value,origin+rootPath);if(url.origin!==origin)return;
    let next=localizedPath(url.pathname+url.search+url.hash,locale);
    if(url.pathname==='/api/auth/discord'){
      const target=url.searchParams.get('return_to');
      if(target){url.searchParams.set('return_to',localizedPath(target,locale));next=url.pathname+url.search+url.hash}
    }
    if(next!==value)el.attr(key,next);
  });
}
const files=htmlFiles('dist');let variants=0,translatedArticles=0;
for(const file of files){
  const relative=path.relative('dist',file),rootPath='/'+relative.replace(/index\.html$/,'');
  const original=fs.readFileSync(file,'utf8');
  for(const locale of ['pt-BR','en-US']){
    const $=load(original);$('html').attr('lang',locale);
    // The sidebar and body are translated together, preserving ids and widgets.
    if(locale==='pt-BR'){
      const source=$('.wiki-content[lang="en"]').filter((_,root)=>!$(root).find('.empty-state').length);
      if(source.length){
        const headings=new Map();
        source.each((_,root)=>{
          $(root).find('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id],.mw-headline[id]').each((_,node)=>headings.set($(node).attr('id'),normalText($(node).text())));
          transformSource($,root,portuguese);$(root).attr('lang','pt-BR');
        });
        for(const [id,before] of headings){
          const heading=$('[id]').filter((_,node)=>$(node).attr('id')===id).first();
          const after=normalText(heading.text());
          $('a[href^="#"]').each((_,node)=>{
            let anchor;try{anchor=decodeURIComponent($(node).attr('href').slice(1))}catch{return}
            if(anchor===id&&normalText($(node).text())===before)$(node).text(after);
          });
        }
        const notice=$('<p class="translation-notice" data-no-translate></p>');
        notice.append('Tradução automática. ',$('<a></a>').attr({href:localizedPath(rootPath,'en-US'),lang:'en-US',hreflang:'en-US'}).text('Ler em inglês'));
        $('.article-reading-tools').first().before(notice);
        translatedArticles++;
      }
    }
    translateUI($,locale);links($,locale,rootPath);
    $('select').wrap('<span class="select-control"></span>');
    // Notice links deliberately point to the other version.
    $('.translation-notice a').attr('href',localizedPath(rootPath,'en-US'));
    if(locale==='en-US'&&relative.startsWith('bot/')){
      const notice=$('<p class="legal-translation-notice" data-no-translate></p>');
      notice.append('Automatic translation. ',$('<a></a>').attr({href:rootPath,lang:'pt-BR',hreflang:'pt-BR'}).text('Read the original in Portuguese.'));
      $('main').prepend(notice);
    }
    $('[data-language-code]').text(locale==='pt-BR'?'PT':'EN');
    $('[data-set-locale]').each((_,node)=>$(node).attr('aria-pressed',String($(node).attr('data-set-locale')===locale)));
    const canonicalPath=new URL($('link[rel="canonical"]').attr('href')||rootPath,origin).pathname;
    $('link[rel="canonical"],link[hreflang]').remove();
    const canonical=origin+localizedPath(canonicalPath,locale);
    $('head').append($('<link rel="canonical">').attr('href',canonical));
    $('meta[property="og:title"]').attr('content',$('title').text());
    $('meta[property="og:description"]').attr('content',$('meta[name="description"]').attr('content')||'');
    $('meta[property="og:url"]').attr('content',canonical);
    $('head').append($('<meta property="og:locale">').attr('content',locale.replace('-','_')));
    for(const language of ['pt-BR','en-US'])$('head').append($('<link rel="alternate">').attr({hreflang:language,href:origin+localizedPath(canonicalPath,language)}));
    $('head').append($('<link rel="alternate" hreflang="x-default">').attr('href',origin+canonicalPath));
    // Historical revision dates are formatted by language without altering dates.
    $('time[data-revision-date][datetime]').each((_,node)=>{
      const date=new Date($(node).attr('datetime'));
      if(!Number.isNaN(date.getTime()))$(node).text(date.toLocaleDateString(locale,{timeZone:'UTC'}));
    });
    const target=path.join('dist',localePrefix(locale).slice(1),relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,$.html());variants++;
  }
}
const search=JSON.parse(fs.readFileSync('dist/data/search.json'));
for(const entry of search){
  entry.excerpt=excerpts.get(normalText(entry.excerpt||''))||entry.excerpt;
}
fs.writeFileSync('dist/data/search.pt-br.json',JSON.stringify(search));
fs.copyFileSync('dist/data/units.json','dist/data/units.pt-br.json');
if(missing.size)throw Error(`Missing ${missing.size} protected translations: ${[...missing].slice(0,5).join(', ')}`);
console.log(`Localized ${variants} documents; ${translatedArticles} Portuguese source articles. Names, numbers, media and source attributes validated.`);
