import { useState, useEffect, useRef, useMemo } from "react";
import type { Note } from "../types";
import { Search } from "./Search";
import { NoteItem } from "./NoteItem";
import { ScrollArea } from "./ScrollArea";
import { previewContent } from "../utils/preview";
import { getDraftContent, getNoteContent } from "../utils/storage";

interface EnhancedSidebarProps {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
  onDelete?: (id: string) => void;
  isMobile: boolean;
}

export function EnhancedSidebar({
  notes,
  activeId,
  onSelect,
  onCreate,
  pinnedIds,
  onTogglePin,
  onDelete,
  isMobile,
}: EnhancedSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openSwipeItemId, setOpenSwipeItemId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [previewsById, setPreviewsById] = useState<Map<string, string>>(new Map());

  const isSearching = searchQuery.trim().length > 0;
  const displayNotes = isSearching && searchResults ? searchResults : notes;

  const orderedNotes = useMemo(() => {
    const pinned = displayNotes.filter((note) => pinnedIds.has(note.id));
    const others = displayNotes.filter((note) => !pinnedIds.has(note.id));
    return [...pinned, ...others].sort((a, b) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [displayNotes, pinnedIds]);

  useEffect(() => {
    let cancelled = false;
    const hydratePreviews = async () => {
      const promises = notes.map(async (note) => {
        const [draft, saved] = await Promise.all([
          getDraftContent(note.id),
          getNoteContent(note.id),
        ]);
        const content = draft ?? saved ?? "";
        const preview = previewContent(content);
        return { id: note.id, preview };
      });
      const results = await Promise.all(promises);
      const next = new Map<string, string>();
      for (const { id, preview } of results) {
        next.set(id, preview);
      }
      if (!cancelled) {
        setPreviewsById(next);
      }
    };
    void hydratePreviews();
    return () => {
      cancelled = true;
    };
  }, [notes]);

  useEffect(() => {
    if (activeId && scrollViewportRef.current) {
      const selectedElement = scrollViewportRef.current.querySelector(`[data-note-id="${activeId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [activeId]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setHighlightedIndex(0);
  };

  useEffect(() => {
    if (!isSearching || !searchResults) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
        if (event.key === "ArrowDown" || event.key === "j") {
          event.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
        } else if (event.key === "ArrowUp" || event.key === "k") {
          event.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        } else if (event.key === "Enter") {
          event.preventDefault();
          const note = searchResults[highlightedIndex];
          if (note) {
            onSelect(note.id);
            clearSearch();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearching, searchResults, highlightedIndex, onSelect]);

  return (
    <div className={`flex h-dvh ${isMobile ? "w-full max-w-full" : "w-[320px]"} flex-col border-r border-muted-foreground/20 dark:bg-muted`}>
      <div className={`px-4 py-2 flex items-center justify-between ${
        isScrolled && "border-b shadow-[0_2px_4px_-1px_rgba(0,0,0,0.15)]"
      }`}>
        <div className="flex items-center gap-1.5 py-1.5">
          <button
            type="button"
            onClick={() => window.close()}
            className="group flex h-3 w-3 items-center justify-center rounded-full bg-red-500 hover:opacity-80"
            aria-label="Close tab"
          >
            <span className="translate-y-[0.5px] text-[10px] font-medium leading-none text-bg opacity-0 group-hover:opacity-100">
              ×
            </span>
          </button>
          <button
            type="button"
            className="group flex h-3 w-3 cursor-default items-center justify-center rounded-full bg-yellow-500 hover:opacity-80"
            aria-hidden="true"
          >
            <span className="translate-y-[0.5px] text-[10px] font-medium leading-none text-bg opacity-0 group-hover:opacity-100">
              −
            </span>
          </button>
          <button
            type="button"
            className="group flex h-3 w-3 cursor-default items-center justify-center rounded-full bg-green-500 hover:opacity-80"
            aria-hidden="true"
          >
            <span className="translate-y-[0.5px] text-[10px] font-medium leading-none text-bg opacity-0 group-hover:opacity-100">
              +
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-muted hover:text-foreground touch-manipulation"
        >
          New
        </button>
      </div>

      <ScrollArea 
        className="flex-1" 
        isMobile={isMobile}
        onScrollCapture={(e: React.UIEvent<HTMLDivElement>) => {
          const viewport = e.currentTarget.querySelector(
            '[data-radix-scroll-area-viewport]'
          );
          if (viewport) {
            const scrolled = viewport.scrollTop > 0;
            setIsScrolled(scrolled);
          }
        }}
      >
        <div ref={scrollViewportRef} className={`flex flex-col w-full ${isMobile ? "w-full" : "w-[320px]"} px-2`}>
          <Search
            notes={notes}
            onSearchResults={setSearchResults}
            inputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setHighlightedIndex={setHighlightedIndex}
            clearSearch={clearSearch}
          />
          {orderedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="mb-3 text-3xl">
                {isSearching ? "🔍" : "📝"}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {isSearching ? "No results found" : "No notes yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                {isSearching
                  ? "Try a different search term or create a new note"
                  : "Create your first note to get started"}
              </p>
              {!isSearching && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="mt-4 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground transition-all hover:bg-accent focus:outline-none"
                >
                  Create Note
                </button>
              )}
            </div>
          ) : (
            <ul>
              {orderedNotes.map((note, index) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  activeId={activeId}
                  onSelect={onSelect}
                  pinnedIds={pinnedIds}
                  onTogglePin={onTogglePin}
                  onDelete={onDelete}
                  isSearching={isSearching}
                  isHighlighted={isSearching && index === highlightedIndex}
                  showDivider={index < orderedNotes.length - 1}
                  isMobile={isMobile}
                  openSwipeItemId={openSwipeItemId}
                  setOpenSwipeItemId={setOpenSwipeItemId}
                  searchQuery={isSearching ? searchQuery : undefined}
                  preview={previewsById.get(note.id) ?? ""}
                />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

