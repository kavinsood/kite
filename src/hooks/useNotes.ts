import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note } from '../types';
import { deriveTitle } from '../utils/title';
import { getNoteContent, getDraftContent, deleteNoteContent, setNoteContent, getAllKeys } from '../utils/storage';

type UseNotesOptions = {
  bucketId: string | null;
  isSynced: boolean;
};

async function getLocalNotes(): Promise<Note[]> {
  if (typeof window === 'undefined') return [];

  const notesById = new Map<string, { content: string; updatedAt: number }>();

  const dbKeys = await getAllKeys();

  for (const key of dbKeys) {
    if (typeof key !== "string") continue;

    if (key.startsWith('note:')) {
      const id = key.slice('note:'.length);
      const content = (await getNoteContent(id)) ?? '';
      const updatedAt = Number(
        window.localStorage.getItem(`noteMeta:${id}:updatedAt`) ?? Date.now(),
      );
      notesById.set(id, { content, updatedAt });
    }

    if (key.startsWith('draft:')) {
      const id = key.slice('draft:'.length);
      const content = (await getDraftContent(id)) ?? '';
      const updatedAt = Number(
        window.localStorage.getItem(`noteMeta:${id}:updatedAt`) ?? Date.now(),
      );
      const existing = notesById.get(id);
      if (!existing || updatedAt >= existing.updatedAt) {
        notesById.set(id, { content, updatedAt });
      }
    }
  }

  return Array.from(notesById.entries())
    .map(([id, { content, updatedAt }]) => ({
      id,
      title: deriveTitle(content),
      updatedAt,
    }))
    .filter((note) => note.title.trim().length > 0 || updatedAtIsMeaningful(note.updatedAt))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function updatedAtIsMeaningful(timestamp: number): boolean {
  return !Number.isNaN(timestamp);
}

export function useNotes({ bucketId, isSynced }: UseNotesOptions) {
  const queryClient = useQueryClient();

  const {
    data: notes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notes', bucketId, isSynced],
    queryFn: async () => {
      if (!isSynced || !bucketId) {
        return getLocalNotes();
      }

      const all: Note[] = [];
      let cursor: string | null = null;

      do {
        const url = cursor ? `/api/notes?cursor=${encodeURIComponent(cursor)}` : '/api/notes';
        const res = await fetch(url, {
          headers: {
            'X-Bucket-Id': bucketId,
          },
        });
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = (await res.json()) as { notes: Note[]; cursor: string | null };
        all.push(...data.notes);
        cursor = data.cursor;
      } while (cursor);

      return all;
    },
  });

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

      const currentNotes = queryClient.getQueryData<Note[]>(['notes', bucketId, isSynced]) ?? [];
      const existing = currentNotes.find((n) => n.id === id);
      const clientUpdatedAt = existing?.updatedAt ?? 0;

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bucket-Id': bucketId,
        },
        body: JSON.stringify({ id, content, clientUpdatedAt }),
      });

      if (res.status === 409) {
        await res.json().catch(() => null);
        const noteRes = await fetch(`/api/note/${id}`, {
          headers: { 'X-Bucket-Id': bucketId },
        });
        if (noteRes.ok) {
          const full = (await noteRes.json()) as { content: string; updatedAt: number };
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              `noteMeta:${id}:updatedAt`,
              String(full.updatedAt),
            );
          }
          await setNoteContent(id, full.content);
          queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
            const others = old.filter((n) => n.id !== id);
            const title = deriveTitle(full.content);
            return [{ id, title, updatedAt: full.updatedAt }, ...others];
          });
        }
        throw new Error('Conflict saving note');
      }

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      return (await res.json()) as { success: boolean; updatedAt: number };
    },
    onMutate: async (newNote) => {
      if (!isSynced || !bucketId) {
        return {};
      }

      await queryClient.cancelQueries({ queryKey: ['notes', bucketId, isSynced] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', bucketId, isSynced]);
      queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
        const title = deriveTitle(newNote.content);
        const now = Date.now();
        const otherNotes = old.filter((n) => n.id !== newNote.id);
        return [{ id: newNote.id, title, updatedAt: now }, ...otherNotes];
      });

      return { previousNotes };
    },
    onError: (_err, _newNote, context) => {
      if (!isSynced || !bucketId) return;
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', bucketId, isSynced], context.previousNotes);
      }
    },
    onSuccess: (data, variables) => {
      const updatedAt = (data as { updatedAt?: number }).updatedAt ?? Date.now();

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

  const saveNote = (id: string, content: string) => {
    saveMutation.mutate({ id, content });
  };

  const createNote = (id: string) => {
    queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
      if (old.some((n) => n.id === id)) return old;
      return [{ id, title: "Untitled", updatedAt: Date.now() }, ...old];
    });
  };

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
      }
      await deleteNoteContent(id);
    } catch {
      // deletion failure is non-fatal; we simply keep the note
    }
  };

  const updateLocalNoteFromContent = (id: string, content: string) => {
    const now = Date.now();
    const title = deriveTitle(content);

    queryClient.setQueryData<Note[]>(['notes', bucketId, isSynced], (old = []) => {
      const others = old.filter((n) => n.id !== id);
      return [{ id, title, updatedAt: now }, ...others];
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`noteMeta:${id}:updatedAt`, String(now));
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
    updateLocalNoteFromContent,
  };
}


