import sanitize from 'sanitize-html';

export function cleanArticle(input, resolve) {
  return sanitize(input, {
    allowedTags: ['a','p','br','hr','b','strong','em','i','s','u','span','div','section','aside','figure','figcaption','img','h2','h3','h4','h5','h6','ul','ol','li','dl','dt','dd','table','thead','tbody','tfoot','tr','td','th','caption','sup','sub','code','pre','blockquote','details','summary','center','big','small'],
    allowedAttributes: { '*': ['id','class','title','aria-label','role'], 'a': ['href','rel','target'], 'img': ['src','alt','width','height','loading','decoding'], 'td': ['colspan','rowspan'], 'th': ['colspan','rowspan','scope'], 'details': ['open'], 'div': ['data-title'] },
    allowedSchemes: ['https'], allowProtocolRelative: false,
    transformTags: {
      a(tag, attrs) {
        const href = attrs.href || '';
        try {
          const parsed = new URL(href, 'https://animeadventures.fandom.com');
          if (parsed.hostname === 'animeadventures.fandom.com' && parsed.pathname.startsWith('/wiki/')) {
            const title = decodeURIComponent(parsed.pathname.slice(6)).replace(/_/g,' ');
            const target = resolve(title);
            if (target) attrs.href = `/artigo/${target.slug}/${parsed.hash}`;
            else attrs.href = parsed.href;
          } else if (href.startsWith('#')) attrs.href = href;
          else attrs.href = parsed.protocol === 'https:' ? parsed.href : '';
          if (attrs.href?.startsWith('https://')) { attrs.target='_blank'; attrs.rel='noopener noreferrer'; }
        } catch { attrs.href = ''; }
        return { tagName: tag, attribs: attrs };
      },
      img(tag, attrs) {
        let src = attrs['data-src'] || attrs.src || '';
        if (src.startsWith('//')) src = 'https:' + src;
        try {
          const url = new URL(src);
          if (!['static.wikia.nocookie.net','vignette.wikia.nocookie.net','images.wikia.com'].includes(url.hostname) || /GUI[_-]|Wiki[-_]wordmark|Fandom[-_]logo|Tier-List_icon/i.test(src)) src = '';
        } catch { src = ''; }
        return { tagName: tag, attribs: { src, alt: attrs.alt || '', loading: 'lazy', decoding: 'async' } };
      },
    },
    exclusiveFilter(frame) {
      return frame.tag === 'img' && !frame.attribs.src || /(?:mw-editsection|mw-empty-elt|navbox|noprint|reference-accessibility-label)/.test(frame.attribs.class || '');
    },
  });
}
