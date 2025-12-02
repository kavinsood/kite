import { useEffect, useMemo, useState } from "react";
import { SidebarLayout } from "./components/SidebarLayout";
import { Editor } from "./components/Editor";
import { CommandPalette } from "./components/CommandPalette";
import { ThemeToggle } from "./components/ThemeToggle";
import { NoteHeader } from "./components/NoteHeader";
import { useMobileDetect } from "./hooks/useMobileDetect";
import { useMobileKeyboard } from "./hooks/useMobileKeyboard";
import { useNotes } from "./hooks/useNotes";
import { useShortcuts } from "./hooks/useShortcuts";
import { Icons } from "./components/Icons";
import type { FullNote } from "./types";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";

const LAST_ACTIVE_KEY = "lastActiveNoteId";
const draftKey = (id: string) => `draft:${id}`;
const PINNED_KEY = "pinnedNotes";

function getInitialIdFromLocation(): string | null {
  const path = window.location.pathname;
  const match = path.match(/\/n\/([^\/]+)/);
  return match ? match[1] : null;
}

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [lastSavedContent, setLastSavedContent] = useState<string>("");
  const [isPersisted, setIsPersisted] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(PINNED_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    } catch {
      return new Set();
    }
  });
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isMobile = useMobileDetect();
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Handle mobile keyboard
  useMobileKeyboard();

  // Data layer: fetching and mutations
  const { notes, isLoading, isError, saveNote, createNote, deleteNote, saveMutation } = useNotes();

  // Handle error state
  useEffect(() => {
    if (isError) {
      setLoadError("Failed to load notes");
    }
  }, [isError]);

  // Boot sequence
  useEffect(() => {
    let id = getInitialIdFromLocation();
    if (!id) {
      const last = localStorage.getItem(LAST_ACTIVE_KEY);
      if (last) {
        id = last;
        window.history.replaceState(null, "", `/n/${id}`);
      }
    }

    if (!id) {
      id = crypto.randomUUID();
      window.history.replaceState(null, "", `/n/${id}`);
    }

    localStorage.setItem(LAST_ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  // Mobile sidebar behavior: hide sidebar when note is selected
  useEffect(() => {
    if (isMobile !== null) {
      if (isMobile) {
        setShowSidebar(!activeId);
      } else {
        setShowSidebar(!isSidebarCollapsed);
      }
    }
  }, [isMobile, activeId, isSidebarCollapsed]);

  // Persist pinned note ids
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(pinnedIds)));
  }, [pinnedIds]);

  const orderedNotes = useMemo(() => {
    const pinned = notes.filter((note) => pinnedIds.has(note.id));
    const others = notes.filter((note) => !pinnedIds.has(note.id));
    return [...pinned, ...others].sort((a, b) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, pinnedIds]);

  // Load sequence when activeId changes
  useEffect(() => {
    let ignore = false;

    if (!activeId) {
      setContent("");
      setIsPersisted(false);
      return;
    }

    window.history.replaceState(null, "", `/n/${activeId}`);
    localStorage.setItem(LAST_ACTIVE_KEY, activeId);
    setRecovered(false);

    const localDraft = localStorage.getItem(draftKey(activeId)) ?? undefined;

    fetch(`/api/note/${activeId}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (localDraft !== undefined) {
            if (!ignore) {
              setContent(localDraft);
            }
          } else {
            if (!ignore) {
              setContent("");
            }
          }
          setIsPersisted(false);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load note");
        }
        const data = (await res.json()) as FullNote;
        if (localDraft !== undefined && localDraft !== data.content) {
          if (!ignore) {
            setContent(localDraft);
            setRecovered(true);
            setIsPersisted(true);
            // We consider the server content as the last saved state so that
            // a subsequent autosave reflects the recovered draft as a real change.
            setLastSavedContent(data.content);
            // Store server content in localStorage for sidebar preview and search index
            window.localStorage.setItem(`note:${activeId}`, data.content);
          }
        } else {
          if (!ignore) {
            setContent(data.content);
            setLastSavedContent(data.content);
            setIsPersisted(true);
            // Store server content in localStorage for sidebar preview and search index
            window.localStorage.setItem(`note:${activeId}`, data.content);
          }
        }
      })
      .catch(() => {
        // Network error: fall back to draft or empty
        if (ignore) return;
        if (localDraft !== undefined) {
          setContent(localDraft);
        } else {
          setContent("");
        }
        setIsPersisted(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeId]);

  // Persist drafts in localStorage
  useEffect(() => {
    if (!activeId) return;
    localStorage.setItem(draftKey(activeId), content);
  }, [activeId, content]);

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Connect Debounce to Mutation
  useDebouncedEffect(
    () => {
      if (!activeId) return;

      // If content hasn't changed since last successful save, skip save and reordering.
      if (content === lastSavedContent) {
        return;
      }

      const trimmed = content.trim();
      if (trimmed === "" && !isPersisted) {
        return;
      }

      // Fire the mutation
      saveNote(activeId, content);
      
      setIsPersisted(true);
      
      // Handle local storage drafts cleanup
      window.localStorage.setItem(draftKey(activeId), content);
      window.localStorage.setItem(`note:${activeId}`, content);
      localStorage.removeItem(draftKey(activeId));
      setLastSavedContent(content);
    },
    1000,
    [content, activeId, isPersisted, lastSavedContent, saveMutation],
  );

  const handleCreate = () => {
    const id = crypto.randomUUID();
    setActiveId(id);
    setContent("");
    setIsPersisted(false);
    window.history.replaceState(null, "", `/n/${id}`);
    localStorage.setItem(LAST_ACTIVE_KEY, id);
    
    // Add the new note to the cache so it appears in sidebar
    createNote(id);
    
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBack = () => {
    setActiveId(null);
    setContent("");
    setIsPersisted(false);
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const handleDelete = async (id?: string) => {
    const idToDelete = id || activeId;
    if (!idToDelete) return;

    await deleteNote(idToDelete);
    localStorage.removeItem(draftKey(idToDelete));

    // Navigate to next note or create new one
    // After deletion, notes will be updated by the hook, but we need to check current state
    const remaining = orderedNotes.filter((n) => n.id !== idToDelete);
    if (remaining.length > 0) {
      const nextId = remaining[0].id;
      setActiveId(nextId);
      window.history.replaceState(null, "", `/n/${nextId}`);
      localStorage.setItem(LAST_ACTIVE_KEY, nextId);
    } else {
      const newId = crypto.randomUUID();
      setActiveId(newId);
      setContent("");
      setIsPersisted(false);
      window.history.replaceState(null, "", `/n/${newId}`);
      localStorage.setItem(LAST_ACTIVE_KEY, newId);
    }
  };

  // Keyboard shortcuts
  useShortcuts({
    activeId,
    orderedNotes,
    isCommandOpen,
    onSelectNote: (id) => {
      setActiveId(id);
      if (isMobile) {
        setShowSidebar(false);
      }
    },
    onTogglePin: handleTogglePin,
    onDelete: () => handleDelete(),
    onOpenCommand: () => setIsCommandOpen(true),
    onToggleSidebar: () => setIsSidebarCollapsed((prev) => !prev),
  });

  // Get updatedAt for current note
  const currentNote = orderedNotes.find((n) => n.id === activeId);
  const noteUpdatedAt = currentNote?.updatedAt ?? Date.now();

  if (isMobile === null) {
    return null; // Wait for mobile detection
  }

  return (
    <SidebarLayout
      notes={orderedNotes}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        if (isMobile) {
          setShowSidebar(false);
        }
      }}
      onCreate={handleCreate}
      pinnedIds={pinnedIds}
      onTogglePin={handleTogglePin}
      onDelete={handleDelete}
      showSidebar={showSidebar}
      onBack={handleBack}
    >
      {activeId ? (
        <>
          <div className="flex h-8 items-center justify-between border-b border-border px-4 text-xs text-muted/90">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-muted hover:text-text transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-md px-1"
                >
                  <Icons.ChevronLeft className="h-4 w-4" />
                  <span className="text-sm">Back</span>
                </button>
              )}
              <NoteHeader updatedAt={noteUpdatedAt} />
            </div>
            <div className="flex items-center gap-3">
              {recovered && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-accent">
                  Recovered local draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {saveMutation.isPending && (
                <span className="font-mono text-[10px] uppercase tracking-wide">
                  Saving...
                </span>
              )}
              {saveMutation.isSuccess && !saveMutation.isPending && (
                <span className="font-mono text-[10px] uppercase tracking-wide">
                  Saved
                </span>
              )}
              {saveMutation.isError && (
                <span className="font-mono text-[10px] uppercase tracking-wide text-red-400">
                  Error
                </span>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={() => handleDelete()}
                className="text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor content={content} onChange={setContent} />
          </div>
        </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
                <p className="text-sm text-muted">Loading notes...</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="text-4xl">⚠️</div>
                <div>
                  <h3 className="text-sm font-semibold text-text mb-1">Failed to load notes</h3>
                  <p className="text-xs text-muted mb-4">{loadError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-md border border-border bg-bg text-sm font-medium text-text transition-all hover:bg-white/5 hover:border-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  Create a note to start
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="text-4xl">📝</div>
                <div>
                  <h3 className="text-sm font-semibold text-text mb-1">No note selected</h3>
                  <p className="text-xs text-muted mb-4">Select a note from the sidebar or create a new one</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-md border border-border bg-bg text-sm font-medium text-text transition-all hover:bg-white/5 hover:border-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  Create a note to start
                </button>
              </div>
            )}
          </div>
        )}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        notes={orderedNotes}
        activeId={activeId}
        pinnedIds={pinnedIds}
        onSelectNote={(id) => {
          setActiveId(id);
          if (isMobile) {
            setShowSidebar(false);
          }
        }}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />
    </SidebarLayout>
  );
}

export default App;
