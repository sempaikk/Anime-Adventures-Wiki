import fs from "node:fs";
import { load } from "cheerio";

const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
const originals = fs.existsSync("source/original-images.json")
  ? JSON.parse(fs.readFileSync("source/original-images.json", "utf8"))
  : {};
const plain = (value) => value.replace(/\s+/g, " ").trim();
for (const page of wiki.articles) {
  const path = `source/rendered/${page.pageid}.json`;
  if (!fs.existsSync(path)) continue;
  const $ = load(JSON.parse(fs.readFileSync(path)).parse.text);
  $(
    'script,style,table,aside,.portable-infobox,.tooltip-contents,.navbox,.scribunto-error,.notice,.wds-tabs,[class*="boxShadow"],[class*="Pos(a)"]',
  ).remove();
  const paragraphs = $("p")
    .map((_, node) => plain($(node).text()))
    .get()
    .filter(
      (value) =>
        value.length > 45 &&
        !/^(?:This page|For a |If you were|Evolution page|TIER LIST|This unit is one)/i.test(
          value,
        ),
    );
  let excerpt =
    paragraphs.find((value) => value.includes(page.title)) ||
    paragraphs[0] ||
    (page.empty
      ? "Esta página ainda não tem conteúdo na fonte original."
      : `Informações e referências sobre ${page.title}.`);
  excerpt = excerpt
    .replace(/\[\s*\d+\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  page.excerpt =
    excerpt.length > 240
      ? excerpt.slice(0, 237).replace(/\s+\S*$/, "") + "…"
      : excerpt;
  page.rendered = true;
}
for (const unit of wiki.units) {
  const original = originals[unit.id];
  if (
    original?.url &&
    !unit.retired &&
    fs.existsSync("public" + original.url)
  ) {
    unit.image = original.url;
    unit.original_image = original;
  }
}
wiki.counts.rendered = wiki.articles.filter((page) => page.rendered).length;
fs.writeFileSync("source/wiki.json", JSON.stringify(wiki));
const index = wiki.articles.map((page) => ({
  title: page.title,
  url: `/artigo/${page.slug}/`,
  excerpt: page.excerpt,
  kind: page.kind,
}));
index.push({
  title: "Anime Adventures Map",
  url: "/mapa/",
  excerpt: wiki.map.data.description,
  kind: "guide",
});
fs.writeFileSync("public/data/search.json", JSON.stringify(index));
fs.writeFileSync("public/data/coverage.json", JSON.stringify(wiki.counts));
console.log(
  `Prepared ${wiki.counts.rendered} articles and ${wiki.units.filter((unit) => unit.original_image).length} original portraits.`,
);
