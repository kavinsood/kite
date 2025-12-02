import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Note } from '../types';
import { deriveTitle } from '../utils/title';

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Hook that manages note data fetching and mutations.
 * Handles React Query operations, optimistic updates, and cache management.
 */
export function useNotes() {
  const queryClient = useQueryClient();

  // Fetch notes list
  const { data: notes = [], isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: () => fetchJson<Note[]>("/api/notes"),
  });

  // Save note mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      return fetchJson<{ success: boolean; updatedAt: number }>("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content }),
      });
    },
    // OPTIMISTIC UPDATE START
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previousNotes = queryClient.getQueryData<Note[]>(['notes']);
      
      // Optimistically update the sidebar title/order
      queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
        const title = deriveTitle(newNote.content);
        const now = Date.now();
        const otherNotes = old.filter(n => n.id !== newNote.id);
        // Put updated note at the top
        return [{ id: newNote.id, title, updatedAt: now }, ...otherNotes];
      });
      
      return { previousNotes };
    },
    // Rollback on error
    onError: (_err, _newNote, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
    },
    onSuccess: (data, variables) => {
      // Update with server timestamp
      queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
        const title = deriveTitle(variables.content);
        const otherNotes = old.filter(n => n.id !== variables.id);
        return [{ id: variables.id, title, updatedAt: data.updatedAt }, ...otherNotes];
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
    queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
      // Check if note already exists
      if (old.some(n => n.id === id)) return old;
      // Add new note at the top
      return [{ id, title: "Untitled", updatedAt: Date.now() }, ...old];
    });
  };

  /**
   * Delete a note from server and cache
   */
  const deleteNote = async (id: string): Promise<void> => {
    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      // Update React Query cache
      queryClient.setQueryData<Note[]>(['notes'], (old = []) => {
        return old.filter((n) => n.id !== id);
      });
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
  };
}

