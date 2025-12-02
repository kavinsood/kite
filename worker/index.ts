import { deriveTitle } from "../src/utils/title";

interface NoteMetadata {
  title?: string;
  updatedAt?: number;
  deleted?: boolean;
}

function getBucket(request: Request): string | null {
  const header = request.headers.get("X-Bucket-Id");
  if (!header) return null;
  return header.trim() || null;
}

function withBucketId(bucketId: string, id: string): string {
  return `${bucketId}:${id}`;
}

function stripBucketPrefix(bucketId: string, key: string): string {
  const prefix = `${bucketId}:`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API ROUTES ---
    if (url.pathname.startsWith("/api/")) {
      const bucketId = getBucket(request);

      // GET /api/notes - list all non-deleted notes (metadata only)
      if (url.pathname === "/api/notes" && request.method === "GET") {
        // No bucket means no server-backed notes
        if (!bucketId) {
          return Response.json([]);
        }

        /**
         * SCALING LIMITATION:
         *
         * This endpoint fetches ALL notes from KV (for the given bucket)
         * and sorts them in memory by updatedAt.
         *
         * For a personal scratchpad with <10k notes per bucket, this is acceptable.
         */
        const notes: Array<{ id: string; title: string; updatedAt: number }> = [];
        let cursor: string | undefined;

        // Loop handles >1000 notes pagination automatically
        do {
          const list = await env.KV.list({
            prefix: `${bucketId}:`,
            cursor,
            limit: 1000,
          });
          for (const key of list.keys) {
            // Filter out deleted via metadata
            const metadata = (key.metadata || {}) as NoteMetadata;
            if (!metadata.deleted) {
              notes.push({
                id: stripBucketPrefix(bucketId, key.name),
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

      // All remaining API routes require a bucketId
      if (!bucketId) {
        return new Response("Unauthorized", { status: 401 });
      }

      // GET /api/note/:id - fetch full content + metadata
      if (url.pathname.startsWith("/api/note/") && request.method === "GET") {
        const id = url.pathname.split("/").pop();
        if (!id) {
          return new Response("Missing id", { status: 400 });
        }

        const key = withBucketId(bucketId, id);

        const { value, metadata } = await env.KV.getWithMetadata<{
          title?: string;
          updatedAt?: number;
          deleted?: boolean;
        }>(key);

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
        const key = withBucketId(bucketId, id);

        // Preserve existing metadata.deleted if present
        const existing = await env.KV.getWithMetadata<NoteMetadata>(key);

        // Just write the key. Metadata is indexed by Cloudflare automatically.
        await env.KV.put(key, content, {
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
        const key = withBucketId(bucketId, id);

        const { value, metadata } = await env.KV.getWithMetadata<NoteMetadata>(key);

        // If there is no value, we still return success to keep client simple.
        if (value === null) {
          return Response.json({ success: true });
        }

        await env.KV.put(key, value, {
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
