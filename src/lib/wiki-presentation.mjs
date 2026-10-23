import { load } from "cheerio";

// Move the original primary infobox without changing any of its source nodes.
export function splitPrimaryInfobox(html) {
  const $ = load(html, {}, false);
  const box = $(".mw-parser-output > .portable-infobox").first();
  const infobox = box.length ? $.html(box) : "";
  box.remove();
  return { html: $.html(), infobox };
}
