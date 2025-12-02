import { deriveTitle } from "../src/utils/title";

interface NoteMetadata {
  title?: string;
  updatedAt?: number;
  deleted?: boolean;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API ROUTES ---
    if (url.pathname.startsWith("/api/")) {
      // GET /api/notes - list all non-deleted notes (metadata only)
      if (url.pathname === "/api/notes" && request.method === "GET") {
        /**
         * SCALING LIMITATION:
         * 
         * This endpoint fetches ALL notes from KV and sorts them in memory by updatedAt.
         * KV list ordering is lexicographical by key, not by metadata, so we must fetch
         * everything to sort by date.
         * 
         * For a personal scratchpad with <10k notes, this is acceptable. For larger
         * scale, consider:
         * - Edge Config: Maintain a sorted JSON index of note IDs + updatedAt
         * - D1: Use a relational database for metadata queries
         * - Summary key: Store a JSON blob with recent notes, update on write
         * 
         * Current approach will timeout or OOM with >10k notes.
         */
        const notes: Array<{ id: string; title: string; updatedAt: number }> = [];
        let cursor: string | undefined;

        // Loop handles >1000 notes pagination automatically
        do {
          const list = await env.KV.list({ cursor, limit: 1000 });
          for (const key of list.keys) {
            // Filter out deleted via metadata
            const metadata = (key.metadata || {}) as NoteMetadata;
            if (!metadata.deleted) {
              notes.push({
                id: key.name,
                title: metadata.title || "Untitled",
                updatedAt: metadata.updatedAt || 0,
              });
            }
          }
          cursor = list.list_complete ? undefined : list.cursor;
        } while (cursor);

        // Sort in memory (fast enough for <10k notes, but see scaling limitation above)
        notes.sort((a, b) => b.updatedAt - a.updatedAt);

        return Response.json(notes);
      }

      // GET /api/note/:id - fetch full content + metadata
      if (url.pathname.startsWith("/api/note/") && request.method === "GET") {
        const id = url.pathname.split("/").pop();
        if (!id) {
          return new Response("Missing id", { status: 400 });
        }

        const { value, metadata } = await env.KV.getWithMetadata<{
          title?: string;
          updatedAt?: number;
          deleted?: boolean;
        }>(id);

        if (value === null || metadata?.deleted === true) {
          return new Response("Not found", { status: 404 });
        }

        return Response.json({
          id,
          content: value,
          updatedAt: metadata?.updatedAt ?? 0,
          deleted: metadata?.deleted ?? false,
        });
      }

      // POST /api/save - upsert content + metadata (server derives title)
      if (url.pathname === "/api/save" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as
          | { id: string; content: string }
          | null;

        if (!body || typeof body.id !== "string" || typeof body.content !== "string") {
          return new Response("Invalid body", { status: 400 });
        }

        const { id, content } = body as { id: string; content: string };

        const title = deriveTitle(content);
        const updatedAt = Date.now();

        // Preserve existing metadata.deleted if present
        const existing = await env.KV.getWithMetadata<NoteMetadata>(id);

        // Just write the key. Metadata is indexed by Cloudflare automatically.
        await env.KV.put(id, content, {
          metadata: {
            title,
            updatedAt,
            deleted: existing.metadata?.deleted ?? false, // reviving if it was deleted
          },
        });

        return Response.json({ success: true, updatedAt });
      }

      // POST /api/delete - soft delete
      if (url.pathname === "/api/delete" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as
          | { id: string }
          | null;
        if (!body || typeof body.id !== "string") {
          return new Response("Invalid body", { status: 400 });
        }

        const { id } = body as { id: string };

        const { value, metadata } = await env.KV.getWithMetadata<NoteMetadata>(id);

        // If there is no value, we still return success to keep client simple.
        if (value === null) {
          return Response.json({ success: true });
        }

        await env.KV.put(id, value, {
          metadata: {
            ...(metadata || {}),
            deleted: true,
          },
        });

        return Response.json({ success: true });
      }

      // API route not matched
      return new Response("API endpoint not found", { status: 404 });
    }

    // Non-API routes: serve frontend assets (SPA fallback handled by Wrangler)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
