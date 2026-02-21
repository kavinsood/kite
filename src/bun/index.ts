import { Database } from "bun:sqlite";
import { BrowserView, BrowserWindow, Updater, Utils } from "electrobun/bun";
import { type KiteRPC } from "../shared/rpc";
import { deriveTitle } from "../shared/title";
import { previewContent } from "../shared/preview";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Database setup
const dataDir = join(
	Bun.env.HOME ?? Bun.env.USERPROFILE ?? ".",
	".kite",
);
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, "kite.db"), { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
	CREATE TABLE IF NOT EXISTS notes (
		id TEXT PRIMARY KEY,
		content TEXT NOT NULL DEFAULT '',
		title TEXT NOT NULL DEFAULT 'Untitled',
		preview TEXT NOT NULL DEFAULT '',
		updated_at INTEGER NOT NULL DEFAULT 0,
		deleted INTEGER NOT NULL DEFAULT 0
	)
`);

db.exec(`
	CREATE TABLE IF NOT EXISTS drafts (
		id TEXT PRIMARY KEY,
		content TEXT NOT NULL DEFAULT ''
	)
`);

// Prepared statements
const listNotesStmt = db.prepare(
	"SELECT id, title, updated_at, preview FROM notes WHERE deleted = 0 ORDER BY updated_at DESC",
);
const getNoteStmt = db.prepare(
	"SELECT content, updated_at FROM notes WHERE id = ? AND deleted = 0",
);
const upsertNoteStmt = db.prepare(`
	INSERT INTO notes (id, content, title, preview, updated_at)
	VALUES (?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		content = excluded.content,
		title = excluded.title,
		preview = excluded.preview,
		updated_at = excluded.updated_at,
		deleted = 0
`);
const deleteNoteStmt = db.prepare(
	"UPDATE notes SET deleted = 1 WHERE id = ?",
);
const getDraftStmt = db.prepare("SELECT content FROM drafts WHERE id = ?");
const upsertDraftStmt = db.prepare(`
	INSERT INTO drafts (id, content) VALUES (?, ?)
	ON CONFLICT(id) DO UPDATE SET content = excluded.content
`);
const deleteDraftStmt = db.prepare("DELETE FROM drafts WHERE id = ?");
const searchNotesStmt = db.prepare(
	"SELECT id, title, updated_at, preview FROM notes WHERE deleted = 0 AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC",
);

// RPC handlers
const rpc = BrowserView.defineRPC<KiteRPC>({
	maxRequestTime: 10000,
	handlers: {
		requests: {
			listNotes: () => {
				const rows = listNotesStmt.all() as Array<{
					id: string;
					title: string;
					updated_at: number;
					preview: string;
				}>;
				return rows.map((r) => ({
					id: r.id,
					title: r.title,
					updatedAt: r.updated_at,
					preview: r.preview,
				}));
			},
			getNote: ({ id }) => {
				const row = getNoteStmt.get(id) as
					| { content: string; updated_at: number }
					| undefined;
				if (!row) return null;
				return { content: row.content, updatedAt: row.updated_at };
			},
			saveNote: ({ id, content }) => {
				const now = Date.now();
				const title = deriveTitle(content);
				const preview = previewContent(content);
				upsertNoteStmt.run(id, content, title, preview, now);
				return { updatedAt: now };
			},
			deleteNote: ({ id }) => {
				deleteNoteStmt.run(id);
				deleteDraftStmt.run(id);
			},
			saveDraft: ({ id, content }) => {
				upsertDraftStmt.run(id, content);
			},
			getDraft: ({ id }) => {
				const row = getDraftStmt.get(id) as
					| { content: string }
					| undefined;
				return row?.content ?? null;
			},
			deleteDraft: ({ id }) => {
				deleteDraftStmt.run(id);
			},
			searchNotes: ({ query }) => {
				const pattern = `%${query}%`;
				const rows = searchNotesStmt.all(pattern, pattern) as Array<{
					id: string;
					title: string;
					updated_at: number;
					preview: string;
				}>;
				return rows.map((r) => ({
					id: r.id,
					title: r.title,
					updatedAt: r.updated_at,
					preview: r.preview,
				}));
			},
		},
		messages: {},
	},
});

// Window setup
const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "Kite",
	url,
	frame: {
		width: 1000,
		height: 700,
		x: 200,
		y: 200,
	},
	rpc,
});

mainWindow.on("close", () => {
	db.close();
	Utils.quit();
});

console.log("Kite started!");
