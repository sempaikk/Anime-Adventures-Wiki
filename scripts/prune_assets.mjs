import fs from 'node:fs';
import path from 'node:path';

function files(folder) {
  return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(folder,entry.name)):[path.join(folder,entry.name)]);
}
/** Only remove unused copied images from a deployment. Source originals and
 * manifests stay available for future imports, attribution and reproducible builds.
 * Include scripts, CSS and JSON so lazy/dynamic image selection stays intact. */
export function pruneAssets(root, extraRoots=[]) {
  const used=new Set();
  for(const folder of [root,...extraRoots])for(const file of files(folder)) {
    if(!/\.(?:html|json|[cm]?js|css|svg|xml)$/.test(file))continue;
    const text=fs.readFileSync(file,'utf8');
    for(const match of text.matchAll(/\/art\/[A-Za-z0-9_./%-]+\.(?:webp|png|gif|jpe?g|avif|svg)/g))used.add(decodeURIComponent(match[0]));
  }
  let removed=0,bytes=0;
  const images=files(path.join(root,'art')).filter(file=>/\.(?:webp|png|gif|jpe?g|avif|svg)$/i.test(file));
  for(const file of images) {
    const url='/'+path.relative(root,file).split(path.sep).join('/');
    if(used.has(url))continue;
    bytes+=fs.statSync(file).size;removed++;fs.unlinkSync(file);
  }
  return {removed,bytes,retained:images.length-removed};
}
