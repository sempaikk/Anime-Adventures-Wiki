import { accountRequest } from "./accounts.mjs";
import { communityRequest } from "./community.mjs";
/** Static site and same-origin account API. Secrets are configured in Cloudflare. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        const community = await communityRequest(request, env);
        if (community) return community;
        return await accountRequest(request, env);
      } catch {
        return Response.json(
          {
            error:
              "Não foi possível concluir agora. Tente novamente em instantes.",
          },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    if (
      /^\/perfil\/[a-z0-9_-]{3,24}\/?$/.test(url.pathname) &&
      ["GET", "HEAD"].includes(request.method)
    ) {
      url.pathname = "/perfil/";
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
