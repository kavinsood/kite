import { useEffect } from "react";
import type { Note } from "../types";
import { Icons } from "./Icons";
import { useSearchIndex } from "../hooks/useSearchIndex";

interface SearchProps {
  notes: Note[];
  onSearchResults: (results: Note[] | null) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setHighlightedIndex: (index: number) => void;
  clearSearch: () => void;
}

export function Search({
  notes,
  onSearchResults,
  inputRef,
  searchQuery,
  setSearchQuery,
  setHighlightedIndex,
  clearSearch,
}: SearchProps) {
  const { search } = useSearchIndex(notes);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      onSearchResults(null);
      setHighlightedIndex(0);
      return;
    }

    // Use in-memory search index - no localStorage I/O in hot loop
    const results = search(q, notes);

    onSearchResults(results);
    setHighlightedIndex(0);
  }, [searchQuery, notes, onSearchResults, setHighlightedIndex, search]);

  return (
    <div className="p-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icons.Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="w-full pl-8 pr-8 py-0.5 rounded-lg text-base sm:text-sm placeholder:text-sm focus:outline-none border border-muted-foreground/20 dark:border-none dark:bg-[#353533] bg-background text-foreground touch-manipulation"
          aria-label="Search notes"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <Icons.X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

