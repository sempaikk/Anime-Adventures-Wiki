import fs from 'node:fs';
import path from 'node:path';
import { cleanArticle } from './sanitize.mjs';
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
  const html = cleanArticle(result.parse.text, findArticle);
  return { html, sections: result.parse.sections || [], ready: true, sourceError };
}
