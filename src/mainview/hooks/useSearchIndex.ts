import { useCallback, useRef } from "react";
import type { Note } from "../types";
import { searchNotes } from "../utils/storage";

export function useSearchIndex(_notes: Note[]) {
	// Keep a local index for real-time search of the currently-editing note
	const indexRef = useRef<Map<string, string>>(new Map());

	const updateNoteContent = (id: string, content: string) => {
		indexRef.current.set(id, content);
	};

	const search = useCallback(
		async (_query: string, notesToSearch: Note[]): Promise<Note[]> => {
			const q = _query.toLowerCase().trim();
			if (!q) return [];

			// Search via SQLite RPC
			const results = await searchNotes(q);

			// Also check the local index for unsaved content in the current editing note
			const rpcIds = new Set(results.map((r) => r.id));
			const localMatches: Note[] = [];
			for (const note of notesToSearch) {
				if (rpcIds.has(note.id)) continue;
				const content = indexRef.current.get(note.id);
				if (!content) continue;
				const title = (note.title || "").toLowerCase();
				const haystack = `${title}\n${content.toLowerCase()}`;
				if (haystack.includes(q)) {
					localMatches.push(note);
				}
			}

			return [...results, ...localMatches];
		},
		[],
	);

	const searchWithPositions = useCallback(
		async (_query: string, notesToSearch: Note[]): Promise<Note[]> => {
			// Delegate to search — position info not critical for the command palette
			return search(_query, notesToSearch);
		},
		[search],
	);

	return {
		search,
		searchWithPositions,
		updateNoteContent,
	};
}
