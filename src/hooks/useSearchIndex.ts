import { useMemo, useEffect, useRef } from "react";
import type { Note } from "../types";

const draftKey = (id: string) => `draft:${id}`;
const noteKey = (id: string) => `note:${id}`;

/**
 * Gets content for a note from localStorage (draft takes precedence over saved).
 * This is only called during index building, not in hot loops.
 */
function getLocalContent(id: string): string {
  if (typeof window === "undefined") return "";
  const draft = window.localStorage.getItem(draftKey(id));
  if (draft !== null) return draft;
  const saved = window.localStorage.getItem(noteKey(id));
  if (saved !== null) return saved;
  return "";
}

/**
 * Hook that maintains an in-memory search index of note content.
 * Loads content from localStorage once and updates incrementally.
 * This prevents synchronous localStorage I/O in search hot loops.
 * 
 * Index hydration is chunked to avoid blocking the main thread during
 * initial load with large note collections.
 */
export function useSearchIndex(notes: Note[]) {
  const indexRef = useRef<Map<string, string>>(new Map());
  const notesRef = useRef<Set<string>>(new Set());
  const hydrationRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Build or update the index when notes change
  useEffect(() => {
    const currentNoteIds = new Set(notes.map((n) => n.id));
    const index = indexRef.current;
    const previousNoteIds = notesRef.current;

    // Cancel any in-flight hydration
    hydrationRef.current.cancelled = true;
    hydrationRef.current = { cancelled: false };

    // Remove deleted notes from index
    for (const id of previousNoteIds) {
      if (!currentNoteIds.has(id)) {
        index.delete(id);
      }
    }

    // Collect notes that need hydration (not yet in index)
    const notesToHydrate: Note[] = [];
    for (const note of notes) {
      if (!index.has(note.id)) {
        notesToHydrate.push(note);
      }
    }

    notesRef.current = currentNoteIds;

    // If no notes need hydration, we're done
    if (notesToHydrate.length === 0) {
      return;
    }

    // Chunk hydration to avoid blocking main thread
    // Process in batches of 50 notes per idle callback
    const BATCH_SIZE = 50;
    let batchIndex = 0;
    const hydrationState = hydrationRef.current;

    const processBatch = () => {
      // Check if hydration was cancelled (notes changed)
      if (hydrationState.cancelled) {
        return;
      }

      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, notesToHydrate.length);
      const batch = notesToHydrate.slice(start, end);

      // Process this batch synchronously (small enough to not block)
      for (const note of batch) {
        if (!index.has(note.id)) {
          const content = getLocalContent(note.id);
          index.set(note.id, content);
        }
      }

      batchIndex++;

      // If more batches remain, schedule the next one
      if (end < notesToHydrate.length) {
        // Use requestIdleCallback if available, fallback to setTimeout
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(processBatch, { timeout: 100 });
        } else {
          setTimeout(processBatch, 0);
        }
      }
    };

    // Start processing first batch
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(processBatch, { timeout: 100 });
    } else {
      setTimeout(processBatch, 0);
    }
  }, [notes]);

  /**
   * Update the index for a specific note (called when note is saved).
   */
  const updateNoteContent = (id: string, content: string) => {
    indexRef.current.set(id, content);
  };

  /**
   * Search notes by query string.
   * Operates entirely on in-memory index - no localStorage I/O.
   */
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

  /**
   * Search notes and return with match positions for sorting.
   * Used by CommandPalette to sort by match position.
   */
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

