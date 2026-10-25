import fs from "node:fs";
import path from "node:path";
import { cleanArticle } from "./sanitize.mjs";
import { articleSections } from "./article-structure.mjs";
import { markUnavailableFacts } from './wiki-presentation.mjs';
import snapshot from "../../source/wiki.json";
import media from "../../source/media-library.json";
import { createCatalog, kindLabels } from "./catalog.mjs";

export const wiki = snapshot;
export const articles = wiki.articles;
export const units = wiki.units;
export const icons = wiki.icons;
export const libraryArticles = articles.filter(
  (page) =>
    !page.editorial && (!page.empty || page.canonical_slug === page.slug),
);
export { kindLabels };
export const catalog = createCatalog(wiki, media);
const imageCopies = new Map(
  units
    .filter((u) => u.image && u.original_image)
    .map((u) => [u.original_image.source_url.split("/revision/")[0], u.image]),
);
const byTitle = new Map(articles.map((p) => [normalize(p.title), p]));
export function normalize(t: string) {
  return t
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
}
export function findArticle(title: string) {
  return catalog.resolve(title);
}
export function articleUrl(title: string) {
  const p = findArticle(title);
  return p
    ? `/artigo/${p.slug}/`
    : `/biblioteca/?q=${encodeURIComponent(title)}`;
}
export function unitUrl(unit: any) {
  return unit.article ? `/artigo/${unit.article}/` : `/personagem/${unit.id}/`;
}
export function art(key: string) {
  return (icons as any)[key]?.url || null;
}
export function metadata(page: any) {
  return {
    url: page.source_url + "?oldid=" + page.revision_id,
    history: page.source_url + "?action=history",
    revision: page.revision_id,
  };
}
export function renderArticle(page: any) {
  const location = path.resolve(`source/rendered/${page.pageid}.json`);
  if (!fs.existsSync(location))
    return { html: "", sections: [], ready: false, sourceError: false };
  const result = JSON.parse(fs.readFileSync(location, "utf8"));
  if (result.parse.revid !== page.revision_id)
    return { html: "", sections: [], ready: false, sourceError: false };
  const sourceError = /class="[^"]*(?:scribunto-error|error mw-ext)/.test(
    result.parse.text,
  );
  const html = markUnavailableFacts(cleanArticle(
    result.parse.text,
    findArticle,
    imageCopies,
    catalog,
  ));
  return { html, sections: articleSections(html), ready: true, sourceError };
}
