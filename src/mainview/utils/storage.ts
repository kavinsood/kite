import { Electroview } from "electrobun/view";
import type { KiteRPC } from "../../shared/rpc";

const rpc = Electroview.defineRPC<KiteRPC>({
	handlers: {
		requests: {},
		messages: {},
	},
});

const electroview = new Electroview({ rpc });

function getRpc() {
	const r = electroview.rpc;
	if (!r) throw new Error("Electroview RPC not initialized");
	return r;
}

export function getNoteContent(id: string): Promise<string | null> {
	return getRpc()
		.request.getNote({ id })
		.then((result) => result?.content ?? null);
}

export async function setNoteContent(
	id: string,
	content: string,
): Promise<void> {
	await getRpc().request.saveNote({ id, content });
}

export async function deleteNoteContent(id: string): Promise<void> {
	await getRpc().request.deleteNote({ id });
}

export function getDraftContent(id: string): Promise<string | null> {
	return getRpc().request.getDraft({ id });
}

export async function setDraftContent(
	id: string,
	content: string,
): Promise<void> {
	await getRpc().request.saveDraft({ id, content });
}

export async function deleteDraftContent(id: string): Promise<void> {
	await getRpc().request.deleteDraft({ id });
}

export function listNotes() {
	return getRpc().request.listNotes({});
}

export function searchNotes(query: string) {
	return getRpc().request.searchNotes({ query });
}
