import { accountRequest } from "./accounts.mjs";
/** Static site and same-origin account API. Secrets are configured in Cloudflare. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
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
    return env.ASSETS.fetch(request);
  },
};
