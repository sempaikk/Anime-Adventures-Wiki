import { accountRequest } from "./accounts.mjs";
import { communityRequest } from "./community.mjs";
import {protectApi, secureResponse} from './security.mjs';
import {maintainStorage} from './maintenance.mjs';
import {documentPath,localizedPath,splitLocale,visitorLocale} from '../src/lib/locales.mjs';
/** Static site and same-origin account API. Secrets are configured in Cloudflare. */
export default {
  async scheduled(_controller,env) {
    try {await maintainStorage(env);}catch {console.error('Wiki storage maintenance unavailable');throw Error('Storage maintenance unavailable');}
  },
  async fetch(request, env) {
    try {
      const rejected = await protectApi(request, env);
      return secureResponse(rejected || await route(request, env), request);
    } catch {
      // No URL, OAuth code, cookie, SQL error or user content enters our logs.
      const area=new URL(request.url).pathname.startsWith('/api/community/')?'community':new URL(request.url).pathname.startsWith('/api/')?'account':'document';
      console.error('Wiki request unavailable', {area,method:request.method});
      return secureResponse(Response.json({error: 'Não foi possível concluir agora. Tente novamente em instantes.'}, {status: 503, headers: {'Cache-Control': 'no-store'}}), request);
    }
  },
};
async function route(request, env) {
    const url = new URL(request.url);
    const previewDownloads = {
      '/api/preview/site-10s/download': ['/previas/site-10s/teste-site-10s.mp4','teste-site-10s.mp4'],
      '/api/preview/site-trailer-30s/download': ['/previas/site-trailer-30s/trailer-site.mp4','trailer-site.mp4'],
      '/api/preview/site-trailer-v2/download': ['/previas/site-trailer-v2/trailer-site-v2.mp4','trailer-site-v2.mp4'],
    };
    const previewDownload = Object.hasOwn(previewDownloads,url.pathname) ? previewDownloads[url.pathname] : null;
    if (previewDownload && ['GET','HEAD'].includes(request.method)) {
      const asset = new URL(previewDownload[0],url);
      const file = await env.ASSETS.fetch(new Request(asset,request));
      if (![200,206].includes(file.status)) return file;
      const headers = new Headers(file.headers);
      headers.set('Content-Disposition',`attachment; filename="${previewDownload[1]}"`);
      headers.set('Cache-Control','no-store');
      headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      return new Response(file.body,{status:file.status,headers});
    }
    if (url.pathname.startsWith("/api/")) {
      const community = await communityRequest(request, env);
      if (community) return community;
      return accountRequest(request, env);
    }
    const selected=splitLocale(url.pathname);
    if (!selected.locale && documentPath(url.pathname) && !/^\/bot\/(?:termos|privacidade)(?:\/|$)/.test(url.pathname) && ['GET','HEAD'].includes(request.method)) {
      url.pathname=localizedPath(url.pathname,visitorLocale(request));
      return new Response(null,{status:302,headers:{Location:url.href,'Cache-Control':'private, no-store',Vary:'Cookie'}});
    }
    if (
      /^\/perfil\/[a-z0-9_-]{3,24}\/?$/.test(selected.pathname) &&
      ["GET", "HEAD"].includes(request.method)
    ) {
      url.pathname = selected.locale?localizedPath('/perfil/',selected.locale):'/perfil/';
      return env.ASSETS.fetch(new Request(url, request));
    }
    const response=await env.ASSETS.fetch(request);
    if(response.status===404&&selected.locale&&documentPath(url.pathname)){
      // Assets serve .html files through clean URLs; requesting 404.html here
      // would return a redirect without the localized error page body.
      url.pathname=localizedPath('/404',selected.locale);
      const page=await env.ASSETS.fetch(new Request(url,request));
      return new Response(page.body,{status:404,headers:page.headers});
    }
    return response;
}
