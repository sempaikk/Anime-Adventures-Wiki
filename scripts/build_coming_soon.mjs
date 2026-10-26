import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';

// Only this small allowlist is published. Wiki sources, accounts and the Git
// history are retained for the future rebuild, outside the release directory.
await rm('dist', {recursive: true, force: true});
await mkdir('dist/coming-soon', {recursive: true});
await cp('maintenance/index.html', 'dist/index.html');
await cp('maintenance/style.css', 'dist/coming-soon/style.css');
await cp('public/art/wiki/b9005499a94d51421c376f10.webp', 'dist/coming-soon/fabled-kingdom.webp');
await cp('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2', 'dist/coming-soon/space-grotesk.woff2');
await cp('node_modules/@fontsource-variable/space-grotesk/LICENSE', 'dist/coming-soon/font-license.txt');
for (const document of ['termos', 'privacidade']) {
  await mkdir(`dist/bot/${document}`, {recursive: true});
  await cp(`public/bot/${document}/index.html`, `dist/bot/${document}/index.html`);
}
await writeFile('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
// Keep attribution alongside the unchanged original screenshot.
await writeFile('dist/coming-soon/credits.json', JSON.stringify({
  image: 'Fabled Kingdom — Anime Adventures',
  source: 'https://animeadventures.fandom.com/wiki/File:Map_-_Fabled_Kingdom.png',
  archive: JSON.parse(await readFile('source/rights.json', 'utf8')).query.rightsinfo,
  modifications: 'None. Blur and shading are applied in CSS.',
}, null, 2) + '\n');
console.log('Coming-soon release ready: one bilingual screen, local scenery/font, and unchanged bot legal documents. No wiki assets or API are published.');
