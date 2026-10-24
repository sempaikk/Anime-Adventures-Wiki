import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
test("every editorial interface image has a game-wiki source and matches its preserved original", () => {
  const art = JSON.parse(fs.readFileSync("source/interface-art.json")),
    media = Object.values(
      JSON.parse(fs.readFileSync("source/media-library.json")),
    );
  for (const item of Object.values(art)) {
    assert.match(
      item.source_url,
      /^https:\/\/animeadventures\.fandom\.com\/wiki\/File:/,
    );
    assert.ok(
      media.some(
        (source) =>
          source.source_page === item.source_url &&
          source.sha256 === item.sha256,
      ),
    );
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync("public" + item.image))
        .digest("hex"),
      item.sha256,
    );
  }
  const layout = fs.readFileSync("src/layouts/Layout.astro", "utf8"),
    home = fs.readFileSync("src/components/WikiHome.astro", "utf8");
  assert.doesNotMatch(
    layout + home,
    /branding-release\.png|banner-summon\.png|adventures-lobby\.png/,
  );
  const branding = JSON.parse(fs.readFileSync("source/branding.json"));
  assert.equal(branding.image, art.logo.image);
  assert.equal(branding.generation, false);
});
