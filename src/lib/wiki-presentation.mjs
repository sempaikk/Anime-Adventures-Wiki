import { load } from "cheerio";

// A malformed source field is missing information, never a valid game value.
// Raw revisions stay intact and remain linked from the source disclosure.
export function markUnavailableFacts(html) {
  const $=load(html,{},false);
  $('.portable-infobox .pi-data').each((_,node)=>{
    const row=$(node),value=row.children('.pi-data-value');
    if(/^(?:true|tryue|false|null|undefined|nan)(?:¥)?$/i.test(value.text().trim()))
      value.empty().append('<span data-ui>Não informado nesta revisão da fonte.</span>');
  });
  return $.root().html();
}

// Move the original primary infobox without changing any of its source nodes.
export function splitPrimaryInfobox(html) {
  const $ = load(html, {}, false);
  const box = $(".mw-parser-output > .portable-infobox").first();
  const infobox = box.length ? $.html(box) : "";
  box.remove();
  return { html: $.html(), infobox };
}
