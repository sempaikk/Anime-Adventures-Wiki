import fs from "node:fs";
import { load } from "cheerio";
import { classify, createCatalog, normalize } from "../src/lib/catalog.mjs";
import { unitFavoriteKey } from "../src/lib/favorite-key.mjs";

const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
const originals = fs.existsSync("source/original-images.json")
  ? JSON.parse(fs.readFileSync("source/original-images.json", "utf8"))
  : {};
const plain = (value) => value.replace(/\s+/g, " ").trim();
const media = fs.existsSync("source/media-library.json")
  ? JSON.parse(fs.readFileSync("source/media-library.json"))
  : {};
const branding = JSON.parse(fs.readFileSync("source/branding.json"));
for (const unit of wiki.units) {
  const candidates = wiki.articles.filter((page) => page.unit_id === unit.id);
  candidates.sort(
    (a, b) =>
      Number(b.title === unit.name) - Number(a.title === unit.name) ||
      Number(a.empty) - Number(b.empty),
  );
  if (candidates[0]) unit.article = candidates[0].slug;
}
for (const page of wiki.articles) {
  page.editorial = [
    "Experiment buff",
    "Summer test",
    "Test sandbox",
    "Unit templates",
  ].includes(page.title);
  const path = `source/rendered/${page.pageid}.json`;
  if (!fs.existsSync(path)) continue;
  const $ = load(JSON.parse(fs.readFileSync(path)).parse.text);
  page.facts = [];
  if (page.unit_id) {
    const infobox = $(".portable-infobox").first();
    infobox.find(".pi-data").each((_, node) => {
      const label = plain($(node).children(".pi-data-label").text());
      const value = $(node).children(".pi-data-value").clone();
      value.find('[class*="Pos(a)"],.tooltip-contents').remove();
      const detail = plain(value.text());
      if (
        label &&
        detail &&
        detail.length < 90 &&
        /deployment cost|total cost|upgrade levels|tower type|damage type|element/i.test(
          label,
        )
      )
        page.facts.push({ label, value: detail });
    });
    page.facts = page.facts.slice(0, 4);
  }
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
  page.kind = classify(page);
}
const catalog = createCatalog(wiki, media);
for (const page of wiki.articles) {
  const unit = wiki.units.find((unit) => unit.id === page.unit_id);
  page.canonical_slug = unit?.article || page.slug;
  page.aliases = unit ? unit.aliases : [];
  page.retired = Boolean(unit?.retired);
  page.thumbnail = unit
    ? unit.image
    : page.kind === "item"
      ? catalog.fileImage(page.title + ".png")?.url || null
      : null;
  if (page.empty && page.canonical_slug !== page.slug)
    page.excerpt = `Consulte ${unit.name} para conhecer esta forma e suas informações.`;
}
wiki.branding = branding;
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
const index = wiki.articles
  .filter(
    (page) =>
      !page.editorial && (!page.empty || page.canonical_slug === page.slug),
  )
  .map((page) => ({
    title: page.title,
    url: `/artigo/${page.slug}/`,
    excerpt: page.excerpt,
    kind: page.kind,
    aliases: page.aliases,
    image: page.thumbnail,
  }));
index.push(
  ...wiki.units
    .filter((unit) => !unit.article)
    .map((unit) => ({
      title: unit.name,
      url: `/personagem/${unit.id}/`,
      excerpt:
        "Forma presente no catálogo. Ainda não há um artigo correspondente no arquivo da fonte.",
      kind: "unit",
      aliases: unit.aliases,
      image: unit.image,
      favorite_id: unitFavoriteKey(unit),
    })),
);
index.push({
  title: "Anime Adventures Map",
  url: "/mapa/",
  excerpt: wiki.map.data.description,
  kind: "guide",
});
fs.writeFileSync("public/data/search.json", JSON.stringify(index));
fs.writeFileSync("public/data/coverage.json", JSON.stringify(wiki.counts));
fs.writeFileSync(
  "public/data/units.json",
  JSON.stringify(
    wiki.units.map((unit) => ({
      id: unit.id,
      favorite_id: unitFavoriteKey(unit),
      name: unit.name,
      aliases: unit.aliases,
      rarity: unit.rarity,
      image: unit.image,
      retired: Boolean(unit.retired),
      url: unit.article
        ? `/artigo/${unit.article}/`
        : `/personagem/${unit.id}/`,
      facts:
        wiki.articles.find((page) => page.slug === unit.article)?.facts || [],
    })),
  ),
);
console.log(
  `Prepared ${wiki.counts.rendered} articles and ${wiki.units.filter((unit) => unit.original_image).length} original portraits.`,
);
