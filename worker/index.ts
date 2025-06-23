export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }

    // Serve static assets
    try {
      // The ASSETS binding serves the static files built by Vite
      return await env.ASSETS.fetch(request);
    } catch (error) {
      // If the asset isn't found, return a 404
      return new Response("Not Found", { status: 404 });
    }
  },
} satisfies ExportedHandler<Env>;
