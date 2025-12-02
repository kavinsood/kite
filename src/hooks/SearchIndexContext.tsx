import { createContext, useContext } from "react";
import type { Note } from "../types";
import { useSearchIndex } from "./useSearchIndex";

interface SearchIndexValue {
  search: (query: string, notes: Note[]) => Note[];
  searchWithPositions: (query: string, notes: Note[]) => Note[];
  updateNoteContent: (id: string, content: string) => void;
}

const SearchIndexContext = createContext<SearchIndexValue | null>(null);

interface SearchIndexProviderProps {
  notes: Note[];
  children: React.ReactNode;
}

export function SearchIndexProvider({ notes, children }: SearchIndexProviderProps) {
  const { search, searchWithPositions, updateNoteContent } = useSearchIndex(notes);

  return (
    <SearchIndexContext.Provider value={{ search, searchWithPositions, updateNoteContent }}>
      {children}
    </SearchIndexContext.Provider>
  );
}

export function useSearchIndexContext() {
  const ctx = useContext(SearchIndexContext);
  if (!ctx) {
    throw new Error("useSearchIndexContext must be used within SearchIndexProvider");
  }
  return ctx;
}


