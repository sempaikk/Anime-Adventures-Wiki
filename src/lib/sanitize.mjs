import sanitize from "sanitize-html";
import { structureArticle } from "./article-structure.mjs";

export function cleanArticle(input, resolve, images = new Map()) {
  return sanitize(structureArticle(input), {
    allowedTags: [
      "a",
      "p",
      "br",
      "hr",
      "b",
      "strong",
      "em",
      "i",
      "s",
      "u",
      "span",
      "div",
      "section",
      "aside",
      "figure",
      "figcaption",
      "img",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "dl",
      "dt",
      "dd",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
      "caption",
      "sup",
      "sub",
      "code",
      "pre",
      "blockquote",
      "details",
      "summary",
      "center",
      "big",
      "small",
      "button",
    ],
    allowedAttributes: {
      "*": [
        "id",
        "class",
        "title",
        "aria-label",
        "role",
        "aria-controls",
        "aria-labelledby",
        "aria-selected",
        "tabindex",
        "data-article-tabs",
        "data-article-panel",
      ],
      a: ["href", "rel", "target"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      details: ["open"],
      div: ["data-title"],
      button: ["type"],
    },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
    transformTags: {
      a(tag, attrs) {
        const href = attrs.href || "";
        try {
          const parsed = new URL(href, "https://animeadventures.fandom.com");
          if (
            parsed.hostname === "animeadventures.fandom.com" &&
            parsed.pathname.startsWith("/wiki/")
          ) {
            const title = decodeURIComponent(parsed.pathname.slice(6)).replace(
              /_/g,
              " ",
            );
            const target = resolve(title);
            if (target) attrs.href = `/artigo/${target.slug}/${parsed.hash}`;
            else attrs.href = parsed.href;
          } else if (href.startsWith("#")) attrs.href = href;
          else attrs.href = parsed.protocol === "https:" ? parsed.href : "";
          if (attrs.href?.startsWith("https://")) {
            attrs.target = "_blank";
            attrs.rel = "noopener noreferrer";
          }
        } catch {
          attrs.href = "";
        }
        return { tagName: tag, attribs: attrs };
      },
      img(tag, attrs) {
        let src = attrs["data-src"] || attrs.src || "";
        if (src.startsWith("//")) src = "https:" + src;
        try {
          const url = new URL(src);
          if (
            ![
              "static.wikia.nocookie.net",
              "vignette.wikia.nocookie.net",
              "images.wikia.com",
            ].includes(url.hostname) ||
            /GUI[_-]|Wiki[-_]wordmark|Fandom[-_]logo|Tier-List_icon/i.test(src)
          )
            src = "";
        } catch {
          src = "";
        }
        const width = /^\d+$/.test(attrs.width || "")
          ? Math.min(Number(attrs.width), 1600)
          : undefined;
        const height = /^\d+$/.test(attrs.height || "")
          ? Math.min(Number(attrs.height), 1600)
          : undefined;
        const original = images.get(src.split("/revision/")[0]);
        if (original) src = original;
        else if (src && width)
          src = src.replace(
            /\/scale-to-width-down\/\d+/,
            "/scale-to-width-down/" + Math.min(width * 2, 1600),
          );
        if (
          !src &&
          attrs.alt &&
          !/GUI[_-]|Wiki[-_]wordmark|Fandom[-_]logo|Tier-List_icon/i.test(
            attrs.src || attrs["data-src"] || "",
          )
        ) {
          return {
            tagName: "span",
            attribs: {
              class: "missing-image-inline",
              role: "img",
              "aria-label": `Imagem indisponível na fonte: ${attrs.alt}`,
              title: `Imagem indisponível na fonte: ${attrs.alt}`,
            },
          };
        }
        return {
          tagName: tag,
          attribs: {
            src,
            alt: attrs.alt || "",
            ...(width ? { width: String(width) } : {}),
            ...(height ? { height: String(height) } : {}),
            class: width && width <= 50 ? "source-icon" : "source-image",
            loading: "lazy",
            decoding: "async",
          },
        };
      },
    },
    exclusiveFilter(frame) {
      return (
        (frame.tag === "img" && !frame.attribs.src) ||
        /(?:mw-editsection|mw-empty-elt|navbox|noprint|reference-accessibility-label|scribunto-error)/.test(
          frame.attribs.class || "",
        )
      );
    },
  });
}
