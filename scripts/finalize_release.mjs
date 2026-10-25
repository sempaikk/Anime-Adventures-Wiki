import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {pruneAssets} from './prune_assets.mjs';

const root = 'dist', hashes = new Set(), pages = [];
function files(folder) {
  return fs.readdirSync(folder, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
}
for (const file of files(root).filter(file => file.endsWith('.html'))) {
  const $ = load(fs.readFileSync(file, 'utf8'));
  $('*').each((_, node) => {
    for (const [key, value] of Object.entries(node.attribs || {}))
      if (/^on/i.test(key) || (/^(href|src|action)$/i.test(key) && /^\s*javascript:/i.test(value))) throw Error(`Unsafe HTML attribute in ${file}: ${key}`);
  });
  $('script:not([src])').each((_, node) => {
    if (!['application/json', 'application/ld+json'].includes($(node).attr('type') || '')) hashes.add(createHash('sha256').update($(node).html()).digest('base64'));
  });
  const canonical = $('link[rel=canonical]').attr('href');
  if (canonical && /^\/(?:pt-br|en-us)\//.test(new URL(canonical).pathname) && !/noindex/i.test($('meta[name=robots]').attr('content') || '')) {
    const languages = $('link[rel=alternate][hreflang]').toArray().map(node => ({lang:$(node).attr('hreflang'), href:$(node).attr('href')}));
    pages.push({canonical, languages});
  }
}
const manifest = [...hashes].sort();
const storage=pruneAssets(root,['worker']);
console.log(`Publication storage: omitted ${storage.removed} unused image files (${(storage.bytes/1048576).toFixed(2)} MiB); ${storage.retained} images retained. Source archive unchanged.`);
fs.writeFileSync('worker/script-hashes.json', JSON.stringify(manifest, null, 2) + '\n');
// Import only after writing the exact hashes of the final localized documents.
const {securityHeaders} = await import('../worker/security.mjs');
const headers = Object.entries(securityHeaders).map(([name,value]) => `  ${name}: ${value}`).join('\n');
fs.writeFileSync(path.join(root, '_headers'), `/*\n${headers}\n\n` + fs.readFileSync('public/_headers', 'utf8'));
if (!process.env.SITE_BASE || ['','/'].includes(process.env.SITE_BASE)) {
  const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const unique = [...new Map(pages.map(page => [page.canonical, page])).values()];
  const xml = unique.map(page => `<url><loc>${escape(page.canonical)}</loc>${page.languages.map(({lang,href})=>`<xhtml:link rel="alternate" hreflang="${escape(lang)}" href="${escape(href)}"/>`).join('')}</url>`).join('\n');
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${xml}\n</urlset>\n`);
  console.log(`Release ready: ${unique.length} indexable URLs in sitemap; ${manifest.length} approved inline script hashes; shared security headers.`);
}
