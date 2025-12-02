import { deriveTitle } from "../src/utils/title";
import { previewContent } from "../src/utils/preview";

interface NoteMetadata {
  title?: string;
  updatedAt?: number;
  deleted?: boolean;
  preview?: string;
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
          return Response.json({ notes: [], cursor: null });
        }

        const initialCursor = url.searchParams.get("cursor") || undefined;
        let cursor: string | undefined = initialCursor;

        while (true) {
          const list = await env.KV.list({
            prefix: `${bucketId}:`,
            cursor,
            limit: 500,
          });

          const notes: Array<{ id: string; title: string; updatedAt: number; preview?: string }> = [];

          for (const key of list.keys) {
            const metadata = (key.metadata || {}) as NoteMetadata;
            if (!metadata.deleted) {
              notes.push({
                id: stripBucketPrefix(bucketId, key.name),
                title: metadata.title || "Untitled",
                updatedAt: metadata.updatedAt || 0,
                preview: metadata.preview,
              });
            }
          }

          if (notes.length > 0) {
            notes.sort((a, b) => b.updatedAt - a.updatedAt);
            return Response.json({
              notes,
              cursor: list.list_complete ? null : list.cursor,
            });
          }

          if (list.list_complete) {
            return Response.json({
              notes: [],
              cursor: null,
            });
          }

          cursor = list.cursor;
        }
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
          | { id: string; content: string; clientUpdatedAt?: number }
          | null;

        if (!body || typeof body.id !== "string" || typeof body.content !== "string") {
          return new Response("Invalid body", { status: 400 });
        }

        const { id, content, clientUpdatedAt } = body as {
          id: string;
          content: string;
          clientUpdatedAt?: number;
        };

        const title = deriveTitle(content);
        const preview = previewContent(content);
        const updatedAt = Date.now();
        const key = withBucketId(bucketId, id);

        const existing = await env.KV.getWithMetadata<NoteMetadata>(key);

        const existingUpdatedAt = existing.metadata?.updatedAt ?? 0;
        if (
          typeof clientUpdatedAt === "number" &&
          clientUpdatedAt < existingUpdatedAt
        ) {
          return Response.json(
            {
              success: false,
              conflict: true,
              updatedAt: existingUpdatedAt,
            },
            { status: 409 },
          );
        }

        // Just write the key. Metadata is indexed by Cloudflare automatically.
        await env.KV.put(key, content, {
          metadata: {
            title,
            updatedAt,
            deleted: existing.metadata?.deleted ?? false,
            preview,
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
