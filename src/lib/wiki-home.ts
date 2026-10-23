import fs from 'node:fs';
import {load} from 'cheerio';
import {wiki, catalog, findArticle} from './wiki';
import {cleanArticle} from './sanitize.mjs';

export const homeSource=wiki.articles.find(page=>page.title==='Anime Adventures Wiki')!;
const raw=JSON.parse(fs.readFileSync(`source/rendered/${homeSource.pageid}.json`,'utf8')).parse.text;
const $=load(raw);
const about=$('div').filter((_,node)=>$(node).contents().toArray().some(child=>child.type==='text'&&child.data.includes('A catastrophic event'))).first().clone();
about.children('div,h3').remove();
about.find('span[typeof="mw:File"]').remove();
export const aboutGame=cleanArticle(about.html()||'',findArticle,new Map(),catalog);
const patch=$('p').filter((_,node)=>$(node).text().includes('New Raid: The Spider!')).first();
export const sourcePatch={title:patch.prev('center').text().trim(),html:cleanArticle($.html(patch),findArticle,new Map(),catalog)};
export const featuredUnits=$('img').toArray().map(node=>catalog.resolveUnit($(node).attr('alt')||'')).filter(Boolean).slice(0,8);
