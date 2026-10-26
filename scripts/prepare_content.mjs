import fs from "node:fs";
import { load } from "cheerio";
import { classify, createCatalog, normalize } from "../src/lib/catalog.mjs";
import { unitFavoriteKey } from "../src/lib/favorite-key.mjs";
import { unitRarities, unitRecords, rarityFromIntro } from "../src/lib/unit-source.mjs";
import { createHash } from "node:crypto";

const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
// Categories can be stale (including the two Vengeful Swordsman forms).
// Prefer the exact identity in the source's actual unit data, with provenance.
const unitDataSource = wiki.sources.find(page => page.title === 'Module:UnitData/Data');
const unitDataText = fs.readFileSync(`source/raw/${unitDataSource.pageid}.wiki`, 'utf8');
if (createHash('sha256').update(unitDataText).digest('hex') !== unitDataSource.sha256)
  throw new Error('UnitData source hash does not match its recorded revision.');
const sourceRecords = unitRecords(unitDataText);
const sourceRarities = unitRarities(unitDataText);
const correctedRarities = [];
for (const unit of wiki.units) {
  const rarity = sourceRarities.get(unit.id);
  if (!rarity) continue;
  if (unit.rarity !== rarity) correctedRarities.push({id: unit.id, name: unit.name, previous: unit.rarity, rarity});
  unit.rarity = rarity;
  for (const page of wiki.articles.filter(page => page.unit_id === unit.id)) page.rarity = rarity;
}
const previousAudit = fs.existsSync('source/unit-data-audit.json') ? JSON.parse(fs.readFileSync('source/unit-data-audit.json')) : {};
const verifiedRarities = new Map(sourceRarities);
const articleChecks = [];

const originals = fs.existsSync("source/original-images.json")
  ? JSON.parse(fs.readFileSync("source/original-images.json", "utf8"))
  : {};
const plain = (value) => value.replace(/\s+/g, " ").trim();
const media = fs.existsSync("source/media-library.json")
  ? JSON.parse(fs.readFileSync("source/media-library.json"))
  : {};
const branding = JSON.parse(fs.readFileSync("source/branding.json"));
const recoveredPortraits = JSON.parse(
  fs.readFileSync("source/portrait-recovery.json"),
);
// Prefer the current exact-form portrait; a documented older wiki image is next.
for (const unit of wiki.units) {
  const current =
    !unit.retired && originals[unit.id]?.url ? originals[unit.id] : null;
  const recovered = recoveredPortraits[unit.id];
  const selected =
    current ||
    ((!unit.image || unit.image_note) && recovered?.url ? recovered : null);
  if (selected && fs.existsSync("public" + selected.url)) {
    unit.image = selected.url;
    unit.image_source = selected.source_page;
    unit.original_image = selected;
    if (selected === recovered) unit.image_note = recovered.note;
    else delete unit.image_note;
  }
}
fs.writeFileSync(
  "worker/community-schema.mjs",
  "// Generated from community and social migrations.\nexport default " +
    JSON.stringify(
      ["migrations/0002_community.sql", "migrations/0003_social.sql"].map(file => fs.readFileSync(file, "utf8")).join("\n")
        .split(";")
        .map((sql) => sql.trim())
        .filter(Boolean),
    ) +
    ";\n",
);
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
  const renderedPage = JSON.parse(fs.readFileSync(path));
  const $ = load(renderedPage.parse.text);
  const identifiedUnit = wiki.units.find(unit => unit.id === page.unit_id);
  if (renderedPage.parse.revid === page.revision_id && identifiedUnit && !verifiedRarities.has(identifiedUnit.id) && page.title === identifiedUnit.name && !page.empty) {
    const declared = rarityFromIntro(identifiedUnit.name, $('p').toArray().map(node => $(node).text()));
    if (declared) {
      if (identifiedUnit.rarity !== declared) correctedRarities.push({id: identifiedUnit.id, name: identifiedUnit.name, previous: identifiedUnit.rarity, rarity: declared});
      identifiedUnit.rarity = declared;
      verifiedRarities.set(identifiedUnit.id, declared);
      for (const sibling of wiki.articles.filter(article => article.unit_id === identifiedUnit.id)) sibling.rarity = declared;
      articleChecks.push({id: identifiedUnit.id, rarity: declared, source: page.source_url, revision: page.revision_id, sha256: page.sha256});
    }
  }
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
fs.writeFileSync('source/unit-data-audit.json', JSON.stringify({
  source: unitDataSource.source_url, revision: unitDataSource.revision_id, sha256: unitDataSource.sha256,
  identities: wiki.units.length, checked: wiki.units.filter(unit => verifiedRarities.has(unit.id)).length,
  moduleChecked: wiki.units.filter(unit => sourceRarities.has(unit.id)).length, articleChecks,
  reviewed: wiki.units.filter(unit => verifiedRarities.has(unit.id) || sourceRecords.has(unit.id)).length,
  without_rarity: wiki.units.filter(unit => sourceRecords.has(unit.id) && !sourceRarities.has(unit.id)).map(unit => ({id:unit.id,name:unit.name})),
  unresolved: wiki.units.filter(unit => !verifiedRarities.has(unit.id) && !sourceRecords.has(unit.id)).map(unit => unit.id),
  corrections: [...new Map([...(previousAudit.sha256 === unitDataSource.sha256 ? previousAudit.corrections || [] : []), ...correctedRarities].map(entry => [entry.id, entry])).values()],
}, null, 2) + '\n');
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
wiki.counts.portraits = wiki.units.filter((unit) => unit.image).length;
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
    favorite_id: page.canonical_slug || page.slug,
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
fs.writeFileSync(
  "source/community-content.json",
  JSON.stringify(
    Object.fromEntries(
      index
        .filter((item) => item.favorite_id)
        .map((item) => [
          item.favorite_id,
          { title: item.title, url: item.url },
        ]),
    ),
  ),
);
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
      source: (() => {
        const page = wiki.articles.find((page) => page.slug === unit.article);
        return page
          ? {
              url: page.source_url + "?oldid=" + page.revision_id,
              revision: page.revision_timestamp,
            }
          : null;
      })(),
    })),
  ),
);
console.log(
  `Prepared ${wiki.counts.rendered} articles and ${wiki.units.filter((unit) => unit.original_image).length} original portraits.`,
);
