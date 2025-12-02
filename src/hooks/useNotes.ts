import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note } from '../types';
import { deriveTitle } from '../utils/title';

type UseNotesOptions = {
  bucketId: string | null;
  isSynced: boolean;
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Build a notes list from localStorage only.
 * Used when the app is in local-only mode (no sync).
 */
function getLocalNotes(): Note[] {
  if (typeof window === 'undefined') return [];

  const notesById = new Map<string, Note>();

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    if (key.startsWith('note:')) {
      const id = key.slice('note:'.length);
      const content = window.localStorage.getItem(key) ?? '';
      const title = deriveTitle(content);
      const updatedAt = Number(
        window.localStorage.getItem(`noteMeta:${id}:updatedAt`) ?? Date.now(),
      );
      notesById.set(id, { id, title, updatedAt });
    }
  }

  return Array.from(notesById.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Hook that manages note data fetching and mutations.
 * Handles React Query operations, optimistic updates, and cache management.
 */
export function useNotes({ bucketId, isSynced }: UseNotesOptions) {
  const queryClient = useQueryClient();

  // Fetch notes list
  const {
    data: notes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notes', bucketId, isSynced],
    queryFn: async () => {
      if (!isSynced || !bucketId) {
        // Local-only mode
        return getLocalNotes();
      }

      return fetchJson<Note[]>('/api/notes', {
        headers: {
          'X-Bucket-Id': bucketId,
        },
      });
    },
  });

  // Save note mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      if (!isSynced || !bucketId) {
        // In local-only mode, we don't hit the server.
        const now = Date.now();
        queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
          const title = deriveTitle(content);
          const others = old.filter((n) => n.id !== id);
          return [{ id, title, updatedAt: now }, ...others];
        });

        // Persist basic metadata locally for ordering across reloads
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`noteMeta:${id}:updatedAt`, String(now));
        }

        return { success: true, updatedAt: now };
      }

      return fetchJson<{ success: boolean; updatedAt: number }>('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bucket-Id': bucketId,
        },
        body: JSON.stringify({ id, content }),
      });
    },
    // OPTIMISTIC UPDATE START
    onMutate: async (newNote) => {
      if (!isSynced || !bucketId) {
        // Optimistic updates for local mode handled in mutationFn
        return {};
      }

      await queryClient.cancelQueries({ queryKey: ['notes', bucketId, isSynced] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', bucketId, isSynced]);

      // Optimistically update the sidebar title/order
      queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
        const title = deriveTitle(newNote.content);
        const now = Date.now();
        const otherNotes = old.filter((n) => n.id !== newNote.id);
        // Put updated note at the top
        return [{ id: newNote.id, title, updatedAt: now }, ...otherNotes];
      });

      return { previousNotes };
    },
    // Rollback on error
    onError: (_err, _newNote, context) => {
      if (!isSynced || !bucketId) return;
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', bucketId, isSynced], context.previousNotes);
      }
    },
    onSuccess: (data, variables) => {
      const updatedAt = (data as { updatedAt?: number }).updatedAt ?? Date.now();

      // Persist basic metadata locally for ordering/search index
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`noteMeta:${variables.id}:updatedAt`, String(updatedAt));
      }

      queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
        const title = deriveTitle(variables.content);
        const otherNotes = old.filter((n) => n.id !== variables.id);
        return [{ id: variables.id, title, updatedAt }, ...otherNotes];
      });
    },
    // OPTIMISTIC UPDATE END
  });

  /**
   * Save a note (triggers mutation)
   */
  const saveNote = (id: string, content: string) => {
    saveMutation.mutate({ id, content });
  };

  /**
   * Create a new note in the cache (doesn't save to server until content is added)
   */
  const createNote = (id: string) => {
    queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
      // Check if note already exists
      if (old.some((n) => n.id === id)) return old;
      // Add new note at the top
      return [{ id, title: "Untitled", updatedAt: Date.now() }, ...old];
    });
  };

  /**
   * Delete a note from server and cache
   */
  const deleteNote = async (id: string): Promise<void> => {
    try {
      if (isSynced && bucketId) {
        await fetch("/api/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bucket-Id": bucketId,
          },
          body: JSON.stringify({ id }),
        });
      }

      // Update React Query cache
      queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
        return old.filter((n) => n.id !== id);
      });

      // Also clean up local metadata
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`noteMeta:${id}:updatedAt`);
        window.localStorage.removeItem(`note:${id}`);
      }
    } catch {
      // deletion failure is non-fatal; we simply keep the note
    }
  };

  return {
    notes,
    isLoading,
    isError,
    saveNote,
    createNote,
    deleteNote,
    saveMutation,
    refetchNotes: refetch,
  };
}


