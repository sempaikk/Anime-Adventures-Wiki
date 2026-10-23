/** Static site and same-origin account API. Secrets are configured in Cloudflare. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/session") {
      return Response.json(
        { enabled: false, user: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Este recurso ainda não está disponível." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return env.ASSETS.fetch(request);
  },
};
