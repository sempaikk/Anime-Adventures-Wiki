import { defineConfig } from 'astro/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const base=process.env.SITE_BASE || '/';
const prefix=base.replace(/\/$/,'');
export default defineConfig({
  site:'https://www.adventureswiki.workers.dev',
  base,
  output: 'static',
  trailingSlash: 'always',
  server: { port: 4321 },
  vite: { server: { allowedHosts: ['.trycloudflare.com', 'localhost'] } },
  integrations:[{name:'portable-public-paths',hooks:{'astro:build:done':async({dir})=>{
    if(!prefix)return;
    async function visit(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const filename=path.join(folder,entry.name);if(entry.isDirectory())await visit(filename);else if(filename.endsWith('.html')){let text=await fs.readFile(filename,'utf8');text=text.replace(/\b(href|src)=(['"])\/(?!\/)/g,(match,attr,quote,offset,whole)=>whole.slice(offset+match.length-1).startsWith(prefix)?match:`${attr}=${quote}${prefix}/`);await fs.writeFile(filename,text)}}}
    await visit(dir.pathname);
  }}}],
});
