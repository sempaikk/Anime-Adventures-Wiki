import { load } from "cheerio";
import { imageKey } from "./catalog.mjs";

const text = (value) => value.replace(/\s+/g, " ").trim();

/** Adapt source widgets into our own inert, readable document structure. */
export function structureArticle(input, catalog = {}) {
  const $ = load(
    input.replace(/\{\{DISPLAYTITLE:[^\n<]*(?:\n|(?=<))/gi, ""),
    {},
    false,
  );
  // Resolve the source's lazy-loading fallbacks at build time. Remove only
  // images already provided by their own container, preserving standalone
  // fallback content and intentional repetitions in other source sections.
  $("noscript").each((_, node) => {
    const fallback = $(node);
    const primary = new Set(
      fallback
        .parent()
        .find("img")
        .toArray()
        .map((image) =>
          imageKey($(image).attr("data-src") || $(image).attr("src") || ""),
        ),
    );
    const fragment = load(fallback.html() || "", {}, false);
    fragment("img").each((_, image) => {
      const source =
        fragment(image).attr("data-src") || fragment(image).attr("src") || "";
      if (source && primary.has(imageKey(source))) fragment(image).remove();
    });
    fragment("a")
      .filter(
        (_, link) =>
          !fragment(link).children().length && !text(fragment(link).text()),
      )
      .remove();
    fallback.replaceWith(fragment.html());
  });
  const missing = (title) =>
    $('<span class="portrait-unavailable" role="img"></span>')
      .attr("aria-label", `Retrato indisponível: ${title}`)
      .text("Sem retrato disponível");
  // Repair old file references using exact filenames or the catalog's documented aliases.
  $(".mw-broken-media").each((_, node) => {
    const reference = $(node),
      title = reference.closest("a").attr("title") || reference.text();
    const image = catalog.fileImage?.(title);
    const replacement = image
      ? $("<img>").attr({
          src: image.url,
          alt: image.name,
          width: "101",
          height: "101",
        })
      : missing(
          title.replace(/^File:/i, "").replace(/\.(png|webp|gif|jpe?g)$/i, ""),
        );
    const link = reference.closest("a");
    if (link.length) link.replaceWith(replacement);
    else reference.replaceWith(replacement);
  });
  $("img").each((_, node) => {
    const image = $(node),
      src = image.attr("data-src") || image.attr("src") || "";
    if (
      !/\/(?:Unknown|Placeholder)\.png(?:\/|$)/i.test(src) &&
      !catalog.isPlaceholderImage?.(src)
    )
      return;
    const owner = image.closest(
      ".advanced-tooltip,.tierList_item,.ChBox_item,.portable-infobox",
    );
    const title = text(
      owner
        .find(".tierList_item__text_name,.ChBox_text,.pi-title")
        .first()
        .text() ||
        image.attr("alt") ||
        "",
    );
    const unit = catalog.resolveUnit?.(title);
    if (unit?.image)
      image.attr({ src: unit.image, alt: unit.name }).removeAttr("data-src");
    else image.replaceWith(missing(title || "personagem"));
  });
  // Some original infoboxes omit the portrait node completely when the file
  // is missing. A verified catalog reference still belongs in the same box.
  $(".portable-infobox").each((_, node) => {
    const infobox = $(node),
      title = text(infobox.find(".pi-title").first().text());
    const unit = catalog.resolveUnit?.(title);
    if (!unit || infobox.find(".pi-image img").length) return;
    const portrait = unit.image
      ? $("<img>").attr({
          src: unit.image,
          alt: unit.name,
          width: String(unit.original_image?.width || 200),
          height: String(unit.original_image?.height || 200),
        })
      : missing(unit.name);
    let figure = infobox.find(".pi-image").first();
    if (!figure.length) {
      figure = $('<figure class="pi-image"></figure>');
      infobox.find(".pi-title").first().after(figure);
    }
    figure.empty().append(portrait);
  });
  // These are duplicate text/image layers used exclusively as shadows in the source.
  $("[class]").each((_, node) => {
    const classes = ($(node).attr("class") || "").split(/\s+/);
    if (
      (classes.includes("Pos(a)") && classes.includes("Z(-1)")) ||
      classes.some((c) => /(?:boxShadow|_background)$/.test(c))
    )
      $(node).remove();
  });
  $(".mw-editsection,.mw-empty-elt,.navbox,.noprint,.scribunto-error").remove();
  $(".error")
    .filter((_, node) => !text($(node).text()))
    .remove();

  // Keep every numeric branch of support-buff widgets, clearly labeled instead of
  // concatenating mutually exclusive values after removing the source CSS.
  const buffs = new Map();
  $('[id^="mw-customcollapsible-"]').each((_, node) => {
    const match = text($(node).text()).match(
      /\[info\]\s*-\s*(.*?)\s*-\s*(?:ON|OFF)$/,
    );
    if (match) buffs.set($(node).attr("id"), match[1]);
  });
  for (const [id, label] of [
    ["Sakura", "Sakura Aura Buff"],
    ["Sasageyo", "Dedicate Your Hearts"],
    ["Kisoko", "Kannonbiraki Benihime Aratame"],
  ]) {
    if (!buffs.has("mw-customcollapsible-" + id))
      buffs.set("mw-customcollapsible-" + id, label);
  }
  const isBuff = (node) =>
    node?.type === "tag" && buffs.has($(node).attr("id"));
  $(".Stats-Box li").each((_, item) => {
    const roots = $(item)
      .find("span[id]")
      .filter(
        (_, node) =>
          isBuff(node) && !$(node).parentsUntil(item).toArray().some(isBuff),
      )
      .toArray();
    if (!roots.length) return;
    const states = [];
    for (const root of roots) {
      const leaves = [root, ...$(root).find("span[id]").toArray()].filter(
        (node) =>
          isBuff(node) && !$(node).find("span[id]").toArray().some(isBuff),
      );
      for (const leaf of leaves) {
        const lineage = [leaf, ...$(leaf).parentsUntil(item).toArray()].filter(
          isBuff,
        );
        const active = lineage
          .filter((n) => $(n).hasClass("mw-collapsed"))
          .map((n) => buffs.get($(n).attr("id")))
          .reverse();
        const value = text($(leaf).text());
        if (
          value &&
          !states.some(
            (s) => s.value === value && s.active.join() === active.join(),
          )
        )
          states.push({ value, active });
      }
    }
    if (!states.length) return;
    const baseline = states.find((s) => !s.active.length);
    if (!baseline) return;
    const group = $('<span class="stat-values"></span>');
    group.append($('<span class="base-stat"></span>').text(baseline.value));
    const details = $(
      '<details class="stat-variants"><summary>Ver bônus de suporte</summary><dl></dl></details>',
    );
    for (const state of states.filter((s) => s !== baseline)) {
      details
        .find("dl")
        .append(
          $("<dt></dt>").text(
            state.active.join(" + ") || "Sem bônus de suporte",
          ),
          $("<dd></dd>").text(state.value),
        );
    }
    if (states.length > 1) group.append(details);
    $(roots[0]).before(group);
    $(roots).remove();
  });
  $('[class*="mw-customtoggle-Buff_OFF"]').remove();
  $(".buffEffect__box,.click-on-I-Box__Container").remove();

  let groupId = 0;
  function tabs(root, panels, labels) {
    if (panels.length < 2) return;
    const id = `article-group-${++groupId}`;
    root.attr("data-article-tabs", id).addClass("article-tabs");
    const nav = $(
      '<div class="article-tab-nav" role="tablist" aria-label="Seções do artigo"></div>',
    );
    panels.each((i, panel) => {
      const title = labels[i] || `Seção ${i + 1}`;
      nav.append(
        $('<button type="button" role="tab"></button>')
          .attr({
            id: `${id}-tab-${i}`,
            "aria-controls": `${id}-panel-${i}`,
            "aria-selected": String(i === 0),
            tabindex: String(i === 0 ? 0 : -1),
          })
          .text(title),
      );
      $(panel)
        .attr({
          "data-article-panel": "",
          id: `${id}-panel-${i}`,
          role: "tabpanel",
          "aria-labelledby": `${id}-tab-${i}`,
        })
        .addClass("article-tab-panel");
      $(panel).prepend($('<h3 class="source-tab-title"></h3>').text(title));
      $(panel).prepend(
        $('<span class="anchor"></span>').attr(
          "id",
          title.replace(/\s+/g, "_"),
        ),
      );
    });
    root.prepend(nav);
  }
  $(".wds-tabs")
    .toArray()
    .reverse()
    .forEach((node) => {
      const nav = $(node),
        root = nav
          .parents()
          .filter((_, e) => $(e).children(".wds-tab__content").length > 0)
          .first();
      if (!root.length) return;
      const labels = nav
        .children()
        .map((_, e) => text($(e).text()))
        .get();
      nav.closest(".wds-tabs__wrapper").length
        ? nav.closest(".wds-tabs__wrapper").remove()
        : nav.remove();
      tabs(root, root.children(".wds-tab__content"), labels);
    });
  $(".mainStats").each((_, node) => {
    const root = $(node),
      labels = [
        ...new Set(
          root
            .children('[id="mw-customcollapsible-statsBox"]')
            .first()
            .text()
            .match(/Level\s+\d+/g) || [],
        ),
      ];
    root.children('[id="mw-customcollapsible-statsBox"]').remove();
    const boxes = root
      .children()
      .first()
      .children('[id="mw-customcollapsible-statsBox"]');
    if (boxes.length > 1) {
      const wrapper = boxes.parent(),
        low = $("<div></div>"),
        high = $("<div></div>");
      boxes.each((_, box) =>
        ($(box).hasClass("mw-collapsed") ? high : low).append(box),
      );
      wrapper.append(low, high);
      tabs(
        wrapper,
        wrapper
          .children("div")
          .filter((_, panel) => panel === low[0] || panel === high[0]),
        labels,
      );
    }
  });

  // Tier entries have three copies of each image and a hidden full description.
  // One accessible expandable card preserves that description without an enormous wall.
  $(".tierList_containerItem__container").each((_, node) => {
    const row = $(node);
    row.children(".advanced-tooltip").each((_, entry) => {
      const source = $(entry),
        body = source.find(".tooltip-contents").first();
      const title =
        text(source.find(".tierList_item__text_name").first().text()) ||
        source.find("img").first().attr("alt") ||
        "Personagem";
      const card = $(
        '<details class="tier-unit"><summary></summary><div class="tier-unit-description"></div></details>',
      );
      let portrait = source.children().first().find("img").first().clone();
      const unit = catalog.resolveUnit?.(title);
      if (unit?.image)
        portrait = $("<img>").attr({
          src: unit.image,
          alt: unit.name,
          width: "90",
          height: "90",
        });
      if (!portrait.length) portrait = missing(title);
      card.find("summary").append(portrait, $("<span></span>").text(title));
      card.children("div").append(body.contents());
      source.replaceWith(card);
    });
    row.children(".tierList_item").remove();
  });
  $(".container_ChBox").each((_, node) => {
    const gallery = $(node),
      entries = gallery.children(".ChBox_item");
    const tierNames = new Set(
      $(".tier-unit>summary>span")
        .map((_, e) => text($(e).text()).toLowerCase())
        .get(),
    );
    const names = entries
      .map((_, e) => text($(e).find(".ChBox_text").text()).toLowerCase())
      .get();
    if (names.length && names.every((name) => tierNames.has(name))) {
      gallery.remove();
      return;
    }
    gallery.addClass("source-unit-gallery");
  });
  $(".ChBox_item").each((_, node) => {
    const entry = $(node),
      title = text(entry.find(".ChBox_text").text());
    const unit = catalog.resolveUnit?.(title);
    if (unit?.image) {
      const image = $("<img>").attr({
        src: unit.image,
        alt: unit.name,
        width: "101",
        height: "101",
      });
      entry.find(".ChBox_img__item").empty().append(image);
    }
    if (unit?.article) {
      // A card becomes one link. Keeping the source's image links inside it
      // creates invalid nested anchors which browsers split outside the card.
      entry.find("a").each((_, anchor) => {
        $(anchor).replaceWith($(anchor).contents());
      });
      const content = entry.contents();
      entry
        .empty()
        .append(
          $("<a></a>").attr("href", `/artigo/${unit.article}/`).append(content),
        );
    }
    if (entry.parent().is("ul,ol")) node.name = "li";
  });
  $(".mobileonly")
    .filter((_, node) => /Fast travel/.test($(node).text()))
    .remove();

  // Tooltips must be available to touch and keyboard users, rather than appearing
  // inline inside headings or disappearing together with the old site's scripts.
  $(".advanced-tooltip")
    .toArray()
    .reverse()
    .forEach((node) => {
      const tooltip = $(node),
        body = tooltip.children(".tooltip-contents").first();
      if (!body.length) return;
      const label = tooltip.clone();
      label.children(".tooltip-contents").remove();
      const title = text(label.text()) || "Mais informações";
      const details = $(
        '<details class="source-explanation"><summary></summary><div></div></details>',
      );
      details.find("summary").text(title);
      details.children("div").append(body.contents());
      tooltip.replaceWith(details);
    });
  // Preserve image layout dimensions; remove decorative positioning entirely.
  $("[style]").each((_, node) => {
    const style = $(node).attr("style") || "";
    if (
      /display\s*:\s*(?:inline-)?flex/.test(style) &&
      !/position\s*:\s*absolute/.test(style)
    )
      $(node).addClass(
        /flex-direction\s*:\s*column/.test(style)
          ? "source-stack"
          : "source-row",
      );
  });
  $("figure").each((_, node) => {
    const figure = $(node),
      caption = text(figure.find("figcaption").text());
    if (
      caption &&
      text(
        figure.parent().clone().children("figure").remove().end().text(),
      ).includes(caption)
    )
      figure.find("figcaption").remove();
  });
  $("table").each((_, node) => {
    const table = $(node),
      columns = table.find("tr").first().children("th,td").length;
    table.addClass(columns > 2 ? "source-table-wide" : "source-table");
    const frame = $(
      '<div class="table-scroll" role="region" tabindex="0" aria-label="Tabela: deslize para ver todas as colunas"></div>',
    );
    table.wrap(frame);
  });
  $("center").each((_, node) => {
    node.tagName = "div";
    $(node).addClass("source-introduction");
  });
  $("p,div.source-introduction").each((_, node) => {
    const paragraph = $(node);
    if (
      paragraph.children().length === 1 &&
      paragraph.children().is("b,strong") &&
      text(paragraph.text()).length > 100
    )
      paragraph.children().replaceWith(paragraph.children().contents());
  });
  $("b,strong").each((_, node) => {
    const bold = $(node);
    if (
      text(bold.text()).length > 180 &&
      !bold.closest("h2,h3,h4,h5,h6,summary,dt").length
    )
      bold.replaceWith(bold.contents());
  });
  $("p")
    .filter(
      (_, node) =>
        !text($(node).text()) &&
        !$(node).find("img,details,button,[id]").length,
    )
    .remove();
  $('[id^="mw-customcollapsible-"],.Stats-Box[id]').removeAttr("id");
  $('.Stats-Box').each((_,node)=>{
    const title=$(node).find('h3').first().clone();title.find('details').remove();
    if(/^(?:Deployment|Upgrade)\b/i.test(text(title.text())))$(node).attr('data-upgrade-step','');
  });
  const ids = new Set();
  $("[id]").each((_, node) => {
    const id = $(node).attr("id");
    if (ids.has(id)) $(node).removeAttr("id");
    else ids.add(id);
  });
  // Remove the original site's jump menus and decorative wrappers, preserving prose.
  $(".mobileonly")
    .filter((_, node) => /^(?:⮝|⮟|back start)/i.test(text($(node).text())))
    .remove();
  return $.html();
}

// Run on the final translated document so the preserved translation corpus stays intact.
export function cleanArticleNavigation($) {
  const ids=new Set($('[id]').toArray().map(node=>$(node).attr('id')));
  $('.wiki-content a[href^="#"]').each((_,node)=>{
    let id;try{id=decodeURIComponent($(node).attr('href').slice(1))}catch{return}
    if(id&&!ids.has(id))$(node).replaceWith($(node).contents());
  });
  $('.wiki-content a[href]').filter((_,node)=>!text($(node).text())&&!$(node).children().length&&!$(node).attr('id')&&!$(node).attr('name')).remove();
  $('.wiki-content a[title]').each((_,node)=>{
    const link=$(node);
    if(!text(link.text())&&!link.attr('aria-label')&&link.find('img').length&&!link.find('img').toArray().some(image=>$(image).attr('alt')?.trim()))link.attr('aria-label',link.attr('title'));
  });
}

export function articleSections(html) {
  const $ = load(html, {}, false),
    result = [],
    seen = new Set();
  $("h2,h3").each((_, node) => {
    if ($(node).closest(".portable-infobox,.Stats-Box,.tier-unit").length)
      return;
    const heading = $(node).clone();
    heading.find("details").remove();
    const line = text(heading.text()),
      anchor = $(node).attr("id") || $(node).find("[id]").first().attr("id");
    if (anchor && line && line.length < 120 && !seen.has(anchor)) {
      result.push({ line, anchor, toclevel: node.tagName === "h2" ? 1 : 2 });
      seen.add(anchor);
    }
  });
  return result.slice(0, 24);
}
