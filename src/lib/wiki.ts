import fs from 'node:fs';
import path from 'node:path';
import sanitize from 'sanitize-html';
import snapshot from '../../source/wiki.json';

export const wiki = snapshot;
export const articles = wiki.articles;
export const units = wiki.units;
export const icons = wiki.icons;
const byTitle = new Map(articles.map(p => [normalize(p.title), p]));
export function normalize(t: string) { return t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/_/g,' ').trim(); }
export function findArticle(title: string) {
  let candidate = title, visited = new Set();
  while (!visited.has(candidate)) {
    visited.add(candidate);
    const found = byTitle.get(normalize(candidate));
    if (found) return found;
    const redirect = Object.entries(wiki.aliases).find(([key]) => normalize(key) === normalize(candidate));
    if (!redirect) return null;
    candidate = redirect[1];
  }
  return null;
}
export function articleUrl(title: string) { const p = findArticle(title); return p ? `/artigo/${p.slug}/` : `/biblioteca/?q=${encodeURIComponent(title)}`; }
export function unitUrl(unit: any) { return unit.article ? `/artigo/${unit.article}/` : `/personagem/${unit.id}/`; }
export function art(key: string) { return (icons as any)[key]?.url || icons['ui-units'].url; }
export function metadata(page: any) {
  return { url: page.source_url + '?oldid=' + page.revision_id, history: page.source_url + '?action=history', revision: page.revision_id };
}
export function renderArticle(page: any) {
  const location = path.resolve(`source/rendered/${page.pageid}.json`);
  if (!fs.existsSync(location)) return { html: '', sections: [], ready: false, sourceError: false };
  const result = JSON.parse(fs.readFileSync(location, 'utf8'));
  if (result.parse.revid !== page.revision_id) return { html: '', sections: [], ready: false, sourceError: false };
  const sourceError = /class="[^"]*(?:scribunto-error|error mw-ext)/.test(result.parse.text);
  const html = sanitize(result.parse.text, {
    allowedTags: ['a','p','br','hr','b','strong','em','i','s','u','span','div','section','aside','figure','figcaption','img','h2','h3','h4','h5','h6','ul','ol','li','dl','dt','dd','table','thead','tbody','tfoot','tr','td','th','caption','sup','sub','code','pre','blockquote','details','summary','center','big','small'],
    allowedAttributes: { '*': ['id','class','title','aria-label','role'], 'a': ['href','rel','target'], 'img': ['src','alt','width','height','loading','decoding'], 'td': ['colspan','rowspan'], 'th': ['colspan','rowspan','scope'], 'details': ['open'], 'div': ['data-title'] },
    allowedSchemes: ['https'], allowProtocolRelative: false,
    transformTags: {
      a(tag, attrs) {
        const href = attrs.href || '';
        try {
          const parsed = new URL(href, 'https://animeadventures.fandom.com');
          if (parsed.hostname === 'animeadventures.fandom.com' && parsed.pathname.startsWith('/wiki/')) {
            const title = decodeURIComponent(parsed.pathname.slice(6)).replace(/_/g,' ');
            const target = findArticle(title);
            if (target) attrs.href = `/artigo/${target.slug}/${parsed.hash}`;
            else attrs.href = parsed.href;
          } else if (href.startsWith('#')) attrs.href = href;
          else attrs.href = parsed.protocol === 'https:' ? parsed.href : '';
          if (attrs.href?.startsWith('https://')) { attrs.target='_blank'; attrs.rel='noopener noreferrer'; }
        } catch { attrs.href = ''; }
        return { tagName: tag, attribs: attrs };
      },
      img(tag, attrs) {
        let src = attrs['data-src'] || attrs.src || '';
        if (src.startsWith('//')) src = 'https:' + src;
        try {
          const url = new URL(src);
          if (!['static.wikia.nocookie.net','vignette.wikia.nocookie.net','images.wikia.com'].includes(url.hostname) || /GUI[_-]|Wiki[-_]wordmark|Fandom[-_]logo|Tier-List_icon/i.test(src)) src = '';
        } catch { src = ''; }
        return { tagName: tag, attribs: { src, alt: attrs.alt || '', loading: 'lazy', decoding: 'async' } };
      },
    },
    exclusiveFilter(frame) {
      return frame.tag === 'img' && !frame.attribs.src || /(?:mw-editsection|mw-empty-elt|navbox|noprint|reference-accessibility-label)/.test(frame.attribs.class || '');
    },
  });
  return { html, sections: result.parse.sections || [], ready: true, sourceError };
}
