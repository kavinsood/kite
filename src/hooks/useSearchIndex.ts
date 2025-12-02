import { useMemo, useEffect, useRef } from "react";
import type { Note } from "../types";
import { getDraftContent, getNoteContent } from "../utils/storage";

export function useSearchIndex(notes: Note[]) {
  const indexRef = useRef<Map<string, string>>(new Map());
  const notesRef = useRef<Set<string>>(new Set());
  const hydrationRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    const currentNoteIds = new Set(notes.map((n) => n.id));
    const index = indexRef.current;
    const previousNoteIds = notesRef.current;

    hydrationRef.current.cancelled = true;
    hydrationRef.current = { cancelled: false };

    for (const id of previousNoteIds) {
      if (!currentNoteIds.has(id)) {
        index.delete(id);
      }
    }

    const notesToHydrate: Note[] = [];
    for (const note of notes) {
      if (!index.has(note.id)) {
        notesToHydrate.push(note);
      }
    }

    notesRef.current = currentNoteIds;

    if (notesToHydrate.length === 0) {
      return;
    }

    const BATCH_SIZE = 50;
    let batchIndex = 0;
    const hydrationState = hydrationRef.current;

    const processBatch = async () => {
      if (hydrationState.cancelled) {
        return;
      }

      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, notesToHydrate.length);
      const batch = notesToHydrate.slice(start, end);

      for (const note of batch) {
        if (!index.has(note.id)) {
          const draft = await getDraftContent(note.id);
          const saved = await getNoteContent(note.id);
          const content = draft ?? saved ?? "";
          index.set(note.id, content);
        }
      }

      batchIndex++;

      if (end < notesToHydrate.length) {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(processBatch, { timeout: 100 });
        } else {
          setTimeout(processBatch, 0);
        }
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(processBatch, { timeout: 100 });
    } else {
      setTimeout(processBatch, 0);
    }
  }, [notes]);

  const updateNoteContent = (id: string, content: string) => {
    indexRef.current.set(id, content);
  };

  const search = useMemo(
    () => (query: string, notesToSearch: Note[]): Note[] => {
      const q = query.toLowerCase().trim();
      if (!q) return [];

      const index = indexRef.current;
      const results: Note[] = [];

      for (const note of notesToSearch) {
        const content = (index.get(note.id) || "").toLowerCase();
        const title = (note.title || "").toLowerCase();
        const haystack = `${title}\n${content}`;

        if (haystack.includes(q)) {
          results.push(note);
        }
      }

      return results;
    },
    []
  );

  const searchWithPositions = useMemo(
    () => (query: string, notesToSearch: Note[]): Note[] => {
      const q = query.toLowerCase().trim();
      if (!q) return [];

      const index = indexRef.current;
      const results: Array<{ note: Note; index: number }> = [];

      for (const note of notesToSearch) {
        const content = (index.get(note.id) || "").toLowerCase();
        const title = (note.title || "").toLowerCase();
        const haystack = `${title}\n${content}`;
        const matchIndex = haystack.indexOf(q);

        if (matchIndex !== -1) {
          results.push({ note, index: matchIndex });
        }
      }

      return results.sort((a, b) => a.index - b.index).map((item) => item.note);
    },
    []
  );

  return {
    search,
    searchWithPositions,
    updateNoteContent,
  };
}

