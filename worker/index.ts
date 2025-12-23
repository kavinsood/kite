export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes are disabled - local storage only
    if (url.pathname.startsWith("/api/")) {
      return new Response("API disabled - local storage only", { status: 404 });
    }

    // Non-API routes: serve frontend assets (SPA fallback handled by Wrangler)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
