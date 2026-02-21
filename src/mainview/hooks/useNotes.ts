import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "../types";
import { deriveTitle } from "../../shared/title";
import { previewContent } from "../../shared/preview";
import { deleteNoteContent, listNotes } from "../utils/storage";

async function getLocalNotes(): Promise<Note[]> {
	return listNotes();
}

export function useNotes() {
	const queryClient = useQueryClient();

	const {
		data: notes = [],
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["notes"],
		queryFn: getLocalNotes,
	});

	const saveMutation = useMutation({
		mutationFn: async ({
			id,
			content,
		}: { id: string; content: string }) => {
			const now = Date.now();
			// Optimistic update
			queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
				const title = deriveTitle(content);
				const preview = previewContent(content);
				const others = old.filter((n) => n.id !== id);
				return [{ id, title, updatedAt: now, preview }, ...others];
			});

			return { success: true, updatedAt: now };
		},
	});

	const saveNote = (id: string, content: string) => {
		saveMutation.mutate({ id, content });
	};

	const createNote = (id: string) => {
		queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
			if (old.some((n) => n.id === id)) return old;
			return [
				{ id, title: "Untitled", updatedAt: Date.now(), preview: "" },
				...old,
			];
		});
	};

	const deleteNote = async (id: string): Promise<void> => {
		queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
			return old.filter((n) => n.id !== id);
		});
		await deleteNoteContent(id);
	};

	const updateLocalNoteFromContent = (id: string, content: string) => {
		const title = deriveTitle(content);
		const preview = previewContent(content);

		queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
			return old.map((n) => {
				if (n.id === id) {
					return { ...n, title, preview };
				}
				return n;
			});
		});
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
