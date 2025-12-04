## README

Kite is a minimal, zero-friction markdown scratchpad.

- **No login, no landing page, no ads, no onboarding.**
- You hit the URL and are **immediately in a markdown editor**.
- Notes are stored in **Cloudflare KV** behind a **single Worker**, with optional protection via **Cloudflare Access / Zero Trust** (outside the app).

The entire design is intentionally **boring** and **obvious** so it can run for years with minimal maintenance.

---

## Architecture

### Frontend

- **Framework**: React + Vite.
- **Editor**: `@uiw/react-codemirror` with markdown language support, configured as a minimal, full-height text area (no gutter, no line numbers).
- **Styling**: Tailwind CSS (via PostCSS), dark theme only:
  - `bg` / `sidebar` / `border` / `text` / `muted` / `accent` colors defined in `tailwind.config.ts`.
- **Layout**:
  - Left **sidebar** listing notes (title + updated time).
  - Right **editor pane** for a single active note.
  - Thin **status bar** at the top of the editor showing save status / recovered draft / delete.

### Backend

- **Runtime**: Cloudflare Worker (configured as the `main` entry).
- **Storage**: Cloudflare KV:
  - Binding name: `KV` (configured in `wrangler.jsonc` and `worker-configuration.d.ts`).
- **Static assets**:
  - Bound as `ASSETS`, served via `env.ASSETS.fetch(request)` for all non-`/api/*` routes.
  - Wrangler is configured with SPA-style not-found handling so `/n/<id>` routes serve `index.html`.

The Worker is both:

- **API** for notes (`/api/*`).
- **Router** for the SPA frontend (falls through to `env.ASSETS.fetch` for everything else).

---

## Data Model

### KV Schema

- **Key**: `id: string` – a UUID v4 (opaque, unguessable).
- **Value**: `content: string` – raw markdown text.
- **Metadata**:

```ts
{
  title: string;      // Derived from first line, first 20 chars, fallback "Untitled"
  updatedAt: number;  // Unix timestamp (ms since epoch)
  deleted?: boolean;  // Soft delete flag
}
```

There is **no additional structure** (no tags, folders, or relational modeling).

---

## API

All API routes live under `/api/*` and are implemented inside the Worker.

### 1. `GET /api/notes`

- **Purpose**: List notes for the sidebar (lightweight, metadata only).
- **Behavior**:
  - Iteratively calls `env.KV.list({ cursor })` to collect **all** keys (handles pagination; does not silently stop at 1000).
  - For each key, reads metadata and builds:
    - `{ id, title, updatedAt }`.
  - Filters out notes with `metadata.deleted === true`.
  - Sorts the array by `updatedAt` descending on the server.
- **Response**:

```ts
Array<{
  id: string;
  title: string;
  updatedAt: number;
}>
```

### 2. `GET /api/note/:id`

- **Purpose**: Fetch a single note’s full content.
- **Behavior**:
  - Uses `env.KV.getWithMetadata<NoteMetadata>(id)`.
  - If value is `null` or `metadata.deleted === true`, returns **404**.
- **Response** (200):

```ts
{
  id: string;
  content: string;
  updatedAt: number;
  deleted?: boolean;
}
```

### 3. `POST /api/save`

- **Input**:

```json
{
  "id": "uuid",
  "content": "markdown text"
}
```

- **Behavior**:
  - Validates that both `id` and `content` are strings.
  - Derives `title` from `content` server-side:
    - First line only.
    - Strips leading `#` and whitespace.
    - Truncates to 20 chars.
    - Fallback `"Untitled"`.
  - Calls `env.KV.getWithMetadata` first to preserve any existing `deleted` flag.
  - Writes with:

```ts
env.KV.put(id, content, {
  metadata: {
    title,
    updatedAt: Date.now(),
    deleted: existing.metadata?.deleted ?? false
  }
});
```

- **Response**:

```json
{
  "success": true,
  "updatedAt": 1730000000000
}
```

### 4. `POST /api/delete`

- **Input**:

```json
{
  "id": "uuid"
}
```

- **Behavior**:
  - Reads the current value and metadata via `getWithMetadata`.
  - If value is `null`, returns `{ success: true }` (idempotent, no error).
  - Otherwise, **re-writes the same value** with metadata `{ ...metadata, deleted: true }`.
- **Response**:

```json
{
  "success": true
}
```

No actual KV keys are deleted; this is **soft delete** only.

---

## Client Behavior & State Machine

### Storage hierarchy

- **L1 (in-memory)**: React state – `notes`, `activeId`, `content`, flags.
- **L2 (local resilience)**: `localStorage`:
  - Per-note drafts: `draft:<id>`.
  - Last open note: `lastActiveNoteId`.
- **L3 (persistence)**: Cloudflare KV.

### State in `App.tsx`

- **State**:
  - `notes: Note[]` – from `GET /api/notes`.
  - `activeId: string | null` – currently open note id.
  - `content: string` – current editor markdown content.
  - `isPersisted: boolean` – has this id ever been successfully saved to KV.
  - `status: 'saving' | 'saved' | 'error' | ''` – tiny status indicator.
  - `recovered: boolean` – whether a local draft was used to override server content.

---

### Boot sequence (on mount)

1. **Fetch sidebar notes**:
   - Call `GET /api/notes`, populate `notes`.
   - If it fails, show an empty list but still allow local drafts.

2. **Determine `activeId`** with this priority:

   1. If `window.location.pathname` is `/n/<uuid>`, use that `uuid`.
   2. Else read `localStorage.lastActiveNoteId`:
      - If present, set as `activeId` and `history.replaceState` to `/n/<id>`.
   3. Else:
      - Generate `uuid` with `uuidv4()`.
      - Set as `activeId`.
      - `history.replaceState` to `/n/<id>`.

3. **Persist choice**:
   - `localStorage.setItem('lastActiveNoteId', id)`.

At this point there may be **no server data** for the chosen id—this is the **“ghost note”** case.

---

### Load sequence (when `activeId` changes)

Whenever `activeId` changes:

1. Update URL:
   - `history.replaceState(null, '', '/n/' + activeId)`.
   - Update `lastActiveNoteId` in `localStorage`.

2. Load local draft:
   - `const localDraft = localStorage.getItem('draft:<activeId>')`.

3. Fetch server content:
   - `GET /api/note/:id`.

4. **Conflict resolution**:

   - **If 404**:
     - If `localDraft` exists → use `localDraft`, `isPersisted = false`.
     - Else → `content = ''`, `isPersisted = false` (new, empty ghost note).

   - **If 200**:
     - If `localDraft` exists **and** `localDraft !== api.content`:
       - Prefer `localDraft`.
       - Set `recovered = true`.
       - Set `isPersisted = true` (the note exists in KV; the draft is “newer” but we still treat it as an existing note id).
     - Else:
       - Use `api.content`.
       - `isPersisted = true`.

   - **If network error**:
     - If `localDraft` exists → use it; `isPersisted = false`.
     - Else → `content = ''`; `isPersisted = false`.

This obeys the **“never trust the network over the user’s local input”** rule.

---

### Change handling and drafts

On every editor change:

- Update `content` state.
- If `activeId` exists, immediately:
  - `localStorage.setItem('draft:<activeId>', content)`.

This ensures that:

- A tab close / crash / network drop still leaves a recoverable draft.
- Recover logic above can override KV content if drafts differ.

---

### Debounced save (no empty-note spam)

A custom `useDebouncedEffect` hook is used to debounce saves by **1000 ms** after typing stops:

```ts
useDebouncedEffect(
  () => {
    if (!activeId) return;

    const trimmed = content.trim();

    // 1. Fully empty + never saved: do nothing (don't spam KV).
    if (trimmed === "" && !isPersisted) {
      setStatus("");
      return;
    }

    // 2. Otherwise, save (including "clearing" real notes to empty).
    setStatus("saving");
    // POST /api/save ...
  },
  1000,
  [content, activeId, isPersisted],
);
```

Rules:

- **New note + empty content + never persisted**:
  - **No save**. KV stays clean.
- **Existing note + cleared content (`''`)**:
  - Save the empty content. The user truly wanted to delete the text.
- **Non-empty content**:
  - Debounced save to `/api/save`.
  - On success:
    - Update `notes` list (derive title client-side for instant UI).
    - Sort notes by `updatedAt` desc.
    - Set `isPersisted = true`, `status = 'saved'`.
    - Clear `draft:<id>` from `localStorage`.

On save error, `status` is set to `"error"`, but **content and drafts are never discarded**.

---

### Delete behavior (soft delete, no trash UI)

- Delete button is a small text control in the top-right status bar of the editor.
- On click:
  - Call `POST /api/delete` with `{ id: activeId }`.
  - On success:
    - Remove the note from `notes` state.
    - Remove `draft:<id>` from `localStorage`.
    - If `lastActiveNoteId` matches this id, clear or overwrite it.
    - Pick the next active note:
      - If other notes exist → the first in sorted `notes`.
      - Otherwise → create a new ghost note id and switch to it.

There is **no Trash view** yet; deleted notes simply stop appearing in the sidebar while still existing in KV.

---

## Worker Routing & SPA Behavior

Because `wrangler.jsonc` sets:

```json
{
  "main": "worker/index.ts",
  "assets": {
    "not_found_handling": "single-page-application"
  }
}
```

the Worker is responsible for **both** API and frontend.

To avoid breaking hard refreshes on `/n/:id`:

- The Worker now:

  - Handles **only** `/api/*` in custom logic.
  - For everything else, calls `env.ASSETS.fetch(request)` so that the built React app is served.
  - Unknown API endpoints return a proper `404` with `"API endpoint not found"`.

This ensures:

- `GET /n/<uuid>` → `index.html` + SPA boot, not a naked 404.
- Browser refresh on a note page works seamlessly.

---

## Running Locally

### Prerequisites

- Node.js + pnpm.
- Wrangler installed (for deploys / types): `pnpm dlx wrangler --help`.

### Install

```bash
pnpm install
```

### Dev (frontend + worker)

For local development with the current setup:

```bash
pnpm dev
```

- Vite dev server serves the React app.
- When using Wrangler’s worker dev flow, ensure your KV binding and `ASSETS` are configured as in `wrangler.jsonc`.

### Build

```bash
pnpm run build
```

- Runs TypeScript build + Vite build for both the Worker bundle and the client bundle.

### Deploy

```bash
pnpm run deploy
```

- Uses `wrangler deploy` with `main: "worker/index.ts"`.
- After deploy, you can gate the URL with **Cloudflare Access** for private use; the app itself remains unaware of any authentication.

---

## Sync model

- By default, notes are **local-only** and stored in `localStorage`.
- To enable sync across devices, open the command palette (`Ctrl/Cmd + K`) and run **“Enable sync”**.
- You’ll be prompted for a passphrase; the browser hashes this passphrase (SHA-256) and sends only the hash as `X-Bucket-Id` to the Worker.
- Notes for that bucket are stored in KV under keys of the form `<bucketId>:<noteId>`.
- On first connect, local and remote notes for the bucket are merged:
  - If an ID exists locally and remotely, the newer `updatedAt` wins.
  - Local-only notes are uploaded.
  - Remote-only notes are downloaded into `localStorage`.

---

## Design Philosophy

- **No login, no landing, no multi-user semantics**:
  - If you can open the URL, you are “logged in”.

- **Single, boring storage model**:
  - KV key = id, value = markdown, metadata = `{ title, updatedAt, deleted }`.
  - No attempts to model folders, tags, or complex relationships.

- **Soft delete over hard delete**:
  - Users eventually delete the wrong thing; disks are cheap.
  - A single `deleted: true` flag prevents UI clutter without losing data.

- **No empty-note spam**:
  - Creating a new note only allocates a UUID and updates the URL.
  - KV is not touched until there is actual, non-empty content OR a real note is cleared.

- **Local drafts > network**:
  - On conflict, local drafts override server content.
  - Offline creation and save failures do not lose user text.

- **Minimal coupling, acceptable duplication**:
  - Title derivation exists in both client (for instant UI) and server (for canonical metadata).
  - This is a pragmatic trade-off between “pure DRY” and latency/user experience.

---

## What This App Is Not

- **Not** a note-taking platform with accounts, teams, or sharing.
- **Not** a WYSIWYG editor; it’s raw markdown text.
- **Not** an AI product; no summarization, tagging, or smart features.
- **Not** a framework playground; it uses React, CodeMirror, and Tailwind in the most straightforward way possible.

It’s a **scratchpad**: open browser → type → close tab → come back later → it’s still there.
