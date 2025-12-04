# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kite is a minimal, zero-friction markdown scratchpad deployed to Cloudflare Workers. No login, no landing page—users hit the URL and are immediately in a markdown editor. Notes are stored in Cloudflare KV with optional sync via passphrase-based buckets.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (frontend + worker)
pnpm run build        # TypeScript build + Vite build
pnpm run lint         # Run ESLint
pnpm run deploy       # Build and deploy to Cloudflare
pnpm run cf-typegen   # Generate Cloudflare Worker types
```

## Architecture

### Two-Part System
- **Frontend** (`src/`): React + Vite SPA with CodeMirror markdown editor
- **Worker** (`worker/index.ts`): Cloudflare Worker serving both API (`/api/*`) and static assets

### Storage Hierarchy
1. **L1 (in-memory)**: React state in `App.tsx`
2. **L2 (local resilience)**: `localStorage` for drafts (`draft:<id>`) and last active note
3. **L3 (persistence)**: Cloudflare KV with optional bucket-based sync

### KV Data Model
- **Key**: UUID v4 (or `<bucketId>:<noteId>` when sync enabled)
- **Value**: Raw markdown content
- **Metadata**: `{ title: string, updatedAt: number, deleted?: boolean }`

### Key Design Decisions
- **Local drafts override server**: On conflict, local draft wins (never trust network over user input)
- **Ghost notes**: New notes only touch KV when non-empty content is saved
- **Soft delete**: Notes are marked `deleted: true`, not removed from KV
- **Title derivation**: Duplicated in client (instant UI) and server (canonical metadata)

## Frontend Structure

```
src/
├── App.tsx              # Main component, state machine, boot sequence
├── components/
│   ├── Editor.tsx       # CodeMirror wrapper
│   ├── EnhancedSidebar.tsx  # Note list with search
│   ├── CommandPalette.tsx   # Cmd+K palette (sync, theme, etc.)
│   └── ...
├── hooks/
│   ├── useNotes.ts          # Note CRUD, sync logic
│   ├── useDebouncedEffect.ts # Debounced save (1000ms)
│   └── useSearchIndex.ts    # Client-side search
└── utils/
    ├── storage.ts       # localStorage helpers
    ├── crypto.ts        # Passphrase hashing for sync
    └── title.ts         # Title extraction from markdown
```

## API Endpoints (Worker)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notes` | GET | List notes (metadata only, paginated KV list) |
| `/api/note/:id` | GET | Fetch single note content |
| `/api/save` | POST | Create/update note `{ id, content }` |
| `/api/delete` | POST | Soft delete note `{ id }` |

All non-`/api/*` routes fall through to `env.ASSETS.fetch()` for SPA behavior.

## Styling

- **Tailwind CSS** with CSS variable-based theming
- Colors defined via HSL variables in `index.css`, mapped in `tailwind.config.ts`
- Primary tokens: `background`, `foreground`, `muted`, `accent`, `border`
- Legacy tokens: `bg`, `sidebar`, `text`, `highlight`

## Sync Feature

- Enabled via command palette (Cmd+K → "Enable sync")
- Passphrase is SHA-256 hashed client-side, sent as `X-Bucket-Id` header
- Notes keyed as `<bucketId>:<noteId>` in KV
- On connect: merges local and remote by comparing `updatedAt`
