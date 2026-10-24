export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
export const fileName = (value) => {
  try {
    return decodeURIComponent(value)
      .replace(/^File:/i, "")
      .replace(/_/g, " ")
      .replace(/\.(?:png|jpe?g|webp|gif)$/i, "")
      .trim();
  } catch {
    return "";
  }
};
export const imageKey = (value) => {
  try {
    return decodeURIComponent(value.split("/revision/")[0]).toLowerCase();
  } catch {
    return value;
  }
};
export const kindLabels = {
  unit: "Personagem",
  item: "Item e recurso",
  mode: "Modo de jogo",
  mechanic: "Mecânica",
  tierlist: "Tier list",
  guide: "Guia e referência",
};

export function classify(page) {
  if (page.unit_id) return "unit";
  const title = normalize(page.title),
    categories = (page.categories || []).join(" ").toLowerCase();
  if (/tier\s*lists?/.test(title)) return "tierlist";
  if (
    /^(story|infinite|raids?|infinity (castle|mansion)|challenges|daily challenges|legend stages|dungeons|tournaments?)$/.test(
      title,
    ) ||
    /category:(?:game ?modes|gamemodes)/.test(categories)
  )
    return "mode";
  if (
    /category:(?:items|materials|currencies|portals|stars|relics)/.test(
      categories,
    ) ||
    /(?: star| potion| portal| capsule)$/.test(title) ||
    ["items", "currencies", "relics"].includes(title)
  )
    return "item";
  if (
    [
      "evolution",
      "traits",
      "effects",
      "abilities",
      "damage types",
      "elements",
      "stats",
      "stat potential",
      "trading",
      "cosmetics",
      "titles",
      "summon",
      "crafting",
      "leveling",
      "limit breaking",
      "unit storage",
    ].includes(title) ||
    /category:(?:mechanics|gameplay mechanics)/.test(categories)
  )
    return "mechanic";
  return "guide";
}

/** Exact names, documented redirects and catalog aliases; never fuzzy form matching. */
export function createCatalog(wiki, library = {}) {
  const pages = new Map(
    wiki.articles.map((page) => [normalize(page.title), page]),
  );
  const slugs = new Map(wiki.articles.map((page) => [page.slug, page]));
  const unitNames = new Map();
  const filenames = new Map();
  const images = new Map();
  const animations = new Map();
  const placeholders = new Set();
  for (const media of Object.values(library))
    if (media.url) {
      if (
        media.sha256 ===
        "efdbfbad303100eb3540d5b72ce2b1ab731193c8f36167eb98095737357d5ccf"
      ) {
        placeholders.add(imageKey(media.key || media.source_url));
        placeholders.add(media.url);
        continue;
      }
      filenames.set(normalize(fileName(media.filename)), media);
      images.set(imageKey(media.key || media.source_url), media.url);
      if (media.animated) animations.set(media.url, media.animation_url);
    }
  for (const unit of wiki.units) {
    for (const name of [unit.name, ...unit.aliases])
      unitNames.set(normalize(name), unit);
    if (unit.image && unit.original_image)
      images.set(imageKey(unit.original_image.source_url), unit.image);
  }
  function resolveUnit(name) {
    return unitNames.get(normalize(name)) || null;
  }
  function resolve(title) {
    let candidate = title;
    const seen = new Set();
    while (!seen.has(normalize(candidate))) {
      seen.add(normalize(candidate));
      const unit = resolveUnit(candidate);
      if (unit?.article) return slugs.get(unit.article) || null;
      const page = pages.get(normalize(candidate));
      if (page) return page;
      const alias = Object.entries(wiki.aliases).find(
        ([name]) => normalize(name) === normalize(candidate),
      );
      if (!alias) break;
      candidate = alias[1];
    }
    return null;
  }
  function fileImage(name) {
    const title = fileName(name),
      exact = filenames.get(normalize(title));
    if (exact) return { ...exact, name: title };
    // Pose is a framing choice. Never replace a Shiny or a different evolution.
    const unit = resolveUnit(title.replace(/\s*\(Pose\)$/i, ""));
    return unit?.image ? { url: unit.image, name: unit.name, unit } : null;
  }
  return {
    resolve,
    resolveUnit,
    fileImage,
    images,
    animations,
    localImages: new Set(images.values()),
    isPlaceholderImage: (value) => placeholders.has(imageKey(value)),
  };
}
