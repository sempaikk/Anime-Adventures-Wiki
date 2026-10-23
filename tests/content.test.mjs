import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { cleanArticle } from "../src/lib/sanitize.mjs";
import { load } from "cheerio";
import { createCatalog } from "../src/lib/catalog.mjs";

const resolve = (t) => (t === "Traits" ? { slug: "traits-165" } : null);
test("community source cannot inject active script, handlers, styles or frames", () => {
  const html = cleanArticle(
    '<script>alert(1)</script><iframe src="https://evil.test"></iframe><p onclick="alert(1)" style="position:fixed">Reference</p><a href="javascript:alert(1)">Unsafe</a>',
    resolve,
  );
  assert.doesNotMatch(
    html,
    /script|iframe|onclick|position:fixed|javascript:/i,
  );
  assert.match(html, /Reference/);
});
test("source tables, text and numbers survive cleanup", () => {
  const html = cleanArticle(
    '<h2 id="Stats">Stats</h2><table><tr><th>Damage</th><td>800 × 1.4</td></tr></table><p>Bleed is applied over 5 seconds.</p>',
    resolve,
  );
  assert.match(html, /<table\b/);
  assert.match(html, /800 × 1.4/);
  assert.match(html, /5 seconds/);
  assert.match(html, /id="Stats"/);
});
test("source Lua failures do not leak a technical traceback into the article", () => {
  const html = cleanArticle(
    '<p>Available reference.</p><strong class="scribunto-error">Lua error: stack traceback</strong>',
    resolve,
  );
  assert.match(html, /Available reference/);
  assert.doesNotMatch(html, /Lua error|traceback/);
});
test("article links stay local and credits remain safe external links", () => {
  const html = cleanArticle(
    '<a href="/wiki/Traits#Divine">Traits</a><a href="https://example.com/info">Credits</a>',
    resolve,
  );
  assert.match(html, /href="\/artigo\/traits-165\/#Divine"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
test("lazy game artwork loads while website icons and foreign trackers are removed", () => {
  const html = cleanArticle(
    '<img data-src="https://static.wikia.nocookie.net/animeadventures/images/a/aa/Agony.png" src="data:image/gif;base64,AA" alt="Agony"><img src="https://evil.test/track.png"><img src="https://static.wikia.nocookie.net/animeadventures/images/a/ab/GUI_Tier-List_icon.png">',
    resolve,
  );
  assert.match(html, /Agony.png/);
  assert.doesNotMatch(html, /data:image|evil.test|GUI_Tier/);
});
test("every original text source matches its recorded digest", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
  assert.equal(wiki.articles.length, 661);
  const paths = new Set();
  for (const page of wiki.sources) {
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(`source/raw/${page.pageid}.wiki`))
        .digest("hex"),
      page.sha256,
      page.title,
    );
    assert(!paths.has(page.slug));
    paths.add(page.slug);
  }
});
test("each imported presentation identifies the exact original revision", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
  for (const page of wiki.articles) {
    const path = `source/rendered/${page.pageid}.json`;
    if (fs.existsSync(path))
      assert.equal(
        JSON.parse(fs.readFileSync(path, "utf8")).parse.revid,
        page.revision_id,
        page.title,
      );
  }
});
test("map markers stay within the original coordinates and preserve their descriptions", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
  const data = wiki.map.data,
    [width, height] = data.mapBounds[1];
  assert.equal(data.origin, "bottom-left");
  assert.equal(data.coordinateOrder, "xy");
  const ids = new Set();
  for (const marker of data.markers) {
    assert(!ids.has(marker.id));
    ids.add(marker.id);
    assert(marker.position[0] >= 0 && marker.position[0] <= width);
    assert(marker.position[1] >= 0 && marker.position[1] <= height);
    assert.equal(typeof marker.popup.title, "string");
    assert.equal(typeof marker.popup.description, "string");
  }
});
test("support buff branches keep their values separate and identify the baseline", () => {
  const html = cleanArticle(
    '<div class="Stats-Box"><ul><li>Damage: <span class="mw-collapsible" id="mw-customcollapsible-Sakura">100</span><span class="mw-collapsible mw-collapsed" id="mw-customcollapsible-Sakura">110</span></li></ul></div>',
    resolve,
  );
  const $ = load(html);
  assert.equal($(".base-stat").text(), "100");
  assert.equal($(".stat-variants dd").text(), "110");
  assert.match($(".stat-variants dt").text(), /Sakura/);
  assert.doesNotMatch(html, /100110/);
});
test("real article skin and level panels remain labeled and independently selectable", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8")),
    page = wiki.articles.find((p) => p.title === "Agony (Divine)");
  const $ = load(
    cleanArticle(
      JSON.parse(fs.readFileSync(`source/rendered/${page.pageid}.json`)).parse
        .text,
      resolve,
    ),
  );
  assert.equal($("[data-article-tabs]").length, 2);
  const stats = $("[data-article-tabs]").last();
  assert.deepEqual(
    stats
      .children(".article-tab-nav")
      .find("button")
      .map((_, node) => $(node).text())
      .get(),
    ["Level 1", "Level 100"],
  );
  assert.equal(stats.children("[data-article-panel]").length, 2);
  for (const panel of stats.children("[data-article-panel]").toArray())
    assert.equal($(panel).find(".Stats-Box").length, 10);
});
test("summaries contain readable text and all original portraits match the cached bytes", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json", "utf8"));
  for (const page of wiki.articles)
    assert.doesNotMatch(
      page.excerpt,
      /\{\{|\}\}|\[\[|\]\]|\|image\d?=|==Overview|class="/,
      page.title,
    );
  for (const unit of wiki.units.filter((unit) => unit.original_image))
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("public" + unit.image))
        .digest("hex"),
      unit.original_image.sha256,
      unit.name,
    );
});
test("old names resolve to the exact current form and skip empty obsolete articles", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json")),
    media = JSON.parse(fs.readFileSync("source/media-library.json")),
    catalog = createCatalog(wiki, media);
  assert.equal(
    catalog.resolve("Metal Knight (Arsenal)").title,
    "Iron Knight (Arsenal)",
  );
  assert.equal(
    catalog.resolve("Golden Freezo (Emperor)").title,
    "Golden Tyrant (Emperor)",
  );
  assert.notEqual(
    catalog.fileImage("Metal Knight (Arsenal).png").url,
    catalog.fileImage("Metal Knight.png").url,
  );
  assert.equal(catalog.fileImage("Dracula (Unholy King).png"), null);
  assert.equal(catalog.fileImage("Agony (Divine) Shiny.png")?.unit, undefined);
});
test("the reported Air/Hill page keeps its descriptions and uses real portraits instead of broken file references", () => {
  const wiki = JSON.parse(fs.readFileSync("source/wiki.json")),
    media = JSON.parse(fs.readFileSync("source/media-library.json")),
    catalog = createCatalog(wiki, media);
  const original = JSON.parse(fs.readFileSync("source/rendered/2732.json"))
    .parse.text;
  const html = cleanArticle(original, catalog.resolve, catalog.images, catalog),
    $ = load(html);
  assert.doesNotMatch(
    $.text(),
    /File:[^\n]*\.(?:png|webp|gif)|Lua error|traceback/,
  );
  assert.equal($(".tier-unit").length, 14);
  assert.equal($(".tier-unit>summary img").length, 12);
  assert.match($(".tier-unit-description").text(), /Godly DPS/);
  assert.equal($(".container_ChBox").length, 0);
  assert(
    $("img")
      .toArray()
      .every((node) => !$(node).attr("src").includes("/Unknown.png/")),
  );
});
test("cached media and animation posters match their recorded bytes without generated imagery", () => {
  const media = JSON.parse(fs.readFileSync("source/media-library.json"));
  for (const entry of Object.values(media).filter((entry) => entry.url)) {
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("public" + entry.url))
        .digest("hex"),
      entry.sha256,
      entry.filename,
    );
    if (entry.animated) {
      assert(
        entry.animation_url.startsWith(
          "https://static.wikia.nocookie.net/animeadventures/images/",
        ),
      );
      assert.equal(entry.processing.generation, false);
      assert.equal(entry.processing.type, "first_frame_lossless");
    }
  }
});
