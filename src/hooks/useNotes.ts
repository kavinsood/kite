import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note } from '../types';
import { deriveTitle } from '../utils/title';
import { previewContent } from '../utils/preview';
import { getNoteContent, getDraftContent, deleteNoteContent, getAllKeys } from '../utils/storage';

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
    .map(([id, { content, updatedAt }]) => {
      const title = deriveTitle(content);
      let preview = window.localStorage.getItem(`noteMeta:${id}:preview`) ?? undefined;
      if (!preview) {
        preview = previewContent(content);
        if (preview) {
          window.localStorage.setItem(`noteMeta:${id}:preview`, preview);
        }
      }

      return {
        id,
        title,
        updatedAt,
        preview,
      };
    })
    .filter((note) => note.title.trim().length > 0 || updatedAtIsMeaningful(note.updatedAt))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function updatedAtIsMeaningful(timestamp: number): boolean {
  return !Number.isNaN(timestamp);
}

export function useNotes() {
  const queryClient = useQueryClient();

  const {
    data: notes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['notes'],
    queryFn: getLocalNotes,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const now = Date.now();
      queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
        const title = deriveTitle(content);
        const preview = previewContent(content);
        const others = old.filter((n) => n.id !== id);
        return [{ id, title, updatedAt: now, preview }, ...others];
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`noteMeta:${id}:updatedAt`, String(now));
        const preview = previewContent(content);
        window.localStorage.setItem(`noteMeta:${id}:preview`, preview);
      }

      return { success: true, updatedAt: now };
    },
  });

  const saveNote = (id: string, content: string) => {
    saveMutation.mutate({ id, content });
  };

  const createNote = (id: string) => {
    queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
      if (old.some((n) => n.id === id)) return old;
      return [{ id, title: "Untitled", updatedAt: Date.now(), preview: "" }, ...old];
    });
  };

  const deleteNote = async (id: string): Promise<void> => {
    try {
      queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
        return old.filter((n) => n.id !== id);
      });

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`noteMeta:${id}:updatedAt`);
        window.localStorage.removeItem(`noteMeta:${id}:preview`);
      }
      await deleteNoteContent(id);
    } catch {
    }
  };

  const updateLocalNoteFromContent = (id: string, content: string) => {
    const title = deriveTitle(content);
    const preview = previewContent(content);

    queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
      return old.map((n) => {
        if (n.id === id) {
          return { ...n, title, preview };
        }
        return n;
      });
    });

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`noteMeta:${id}:preview`, preview);
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
    updateLocalNoteFromContent,
  };
}


