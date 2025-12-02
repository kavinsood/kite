import { useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import { SidebarLayout } from "./components/SidebarLayout";
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
import { generateBucketId } from "./utils/crypto";
import { SearchIndexProvider, useSearchIndexContext } from "./hooks/SearchIndexContext";
import { getDraftContent, getNoteContent, setDraftContent, setNoteContent, deleteDraftContent, getAllKeys } from "./utils/storage";

const LAST_ACTIVE_KEY = "lastActiveNoteId";
const draftKey = (id: string) => `draft:${id}`;
const PINNED_KEY = "pinnedNotes";
const BUCKET_ID_KEY = "kite_bucket_id";
const IS_SYNCED_KEY = "kite_is_synced";

const LazyEditor = lazy(async () => {
  const mod = await import("./components/Editor");
  return { default: mod.Editor };
});

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
  const [bucketId, setBucketId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(BUCKET_ID_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  });
  const [isSynced, setIsSynced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(IS_SYNCED_KEY) === "true";
  });
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
  const isSyncInProgressRef = useRef(false);

  useMobileKeyboard();

  const {
    notes,
    isLoading,
    isError,
    saveNote,
    createNote,
    deleteNote,
    saveMutation,
    refetchNotes,
    updateLocalNoteFromContent,
  } = useNotes({
    bucketId,
    isSynced,
  });
  const { updateNoteContent } = useSearchIndexContext();

  useEffect(() => {
    if (isError) {
      setLoadError("Failed to load notes");
    }
  }, [isError]);

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

  useEffect(() => {
    if (isMobile !== null) {
      if (isMobile) {
        setShowSidebar(!activeId);
      } else {
        setShowSidebar(!isSidebarCollapsed);
      }
    }
  }, [isMobile, activeId, isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(pinnedIds)));
  }, [pinnedIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (bucketId) {
      window.localStorage.setItem(BUCKET_ID_KEY, bucketId);
    } else {
      window.localStorage.removeItem(BUCKET_ID_KEY);
    }
    window.localStorage.setItem(IS_SYNCED_KEY, isSynced ? "true" : "false");
  }, [bucketId, isSynced]);

  const orderedNotes = useMemo(() => {
    const pinned = notes.filter((note) => pinnedIds.has(note.id));
    const others = notes.filter((note) => !pinnedIds.has(note.id));
    return [...pinned, ...others].sort((a, b) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, pinnedIds]);

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

    let localDraft: string | undefined;

    const loadLocal = async () => {
      localDraft = (await getDraftContent(activeId)) ?? undefined;
      if (!isSynced || !bucketId) {
        if (localDraft !== undefined) {
          if (!ignore) {
            setContent(localDraft);
            setLastSavedContent(localDraft);
            setIsPersisted(true);
          }
        } else {
          const localContent = (await getNoteContent(activeId)) ?? "";
          if (!ignore) {
            setContent(localContent);
            setLastSavedContent(localContent);
            setIsPersisted(localContent.length > 0);
          }
        }
        return;
      }

      void fetch(`/api/note/${activeId}`, {
      headers: bucketId ? { "X-Bucket-Id": bucketId } : undefined,
    })
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
            setLastSavedContent(data.content);
            void setNoteContent(activeId, data.content);
          }
        } else {
          if (!ignore) {
            setContent(data.content);
            setLastSavedContent(data.content);
            setIsPersisted(true);
            void setNoteContent(activeId, data.content);
          }
        }
      })
      .catch(() => {
        if (ignore) return;
        if (localDraft !== undefined) {
          setContent(localDraft);
        } else {
          setContent("");
        }
        setIsPersisted(false);
      });
    };

    void loadLocal();

    return () => {
      ignore = true;
    };
  }, [activeId, bucketId, isSynced]);

  useEffect(() => {
    if (!activeId) return;
    void setDraftContent(activeId, content);
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

  useDebouncedEffect(
    () => {
      if (!activeId) return;

      if (content === lastSavedContent) {
        return;
      }

      saveNote(activeId, content);
      
      setIsPersisted(true);

      void setNoteContent(activeId, content);
      void deleteDraftContent(activeId);
      setLastSavedContent(content);
    },
    1000,
    [content, activeId, isPersisted, lastSavedContent, saveMutation],
  );

  useDebouncedEffect(
    () => {
      if (!activeId) return;
      const trimmed = content.trim();
      if (trimmed === "" && !isPersisted) return;
      updateLocalNoteFromContent(activeId, content);
      updateNoteContent(activeId, content);
    },
    150,
    [content, activeId, isPersisted, updateLocalNoteFromContent],
  );

  const handleCreate = () => {
    const id = crypto.randomUUID();
    setActiveId(id);
    setContent("");
    setIsPersisted(false);
    window.history.replaceState(null, "", `/n/${id}`);
    localStorage.setItem(LAST_ACTIVE_KEY, id);
    
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

  const getLocalNotesWithContent = async () => {
    if (typeof window === "undefined") return new Map<string, { content: string; updatedAt: number }>();

    const map = new Map<string, { content: string; updatedAt: number }>();
    const dbKeys = await getAllKeys();

    for (const key of dbKeys) {
      if (typeof key !== "string") continue;

      if (key.startsWith("note:")) {
        const id = key.slice("note:".length);
        const content = (await getNoteContent(id)) ?? "";
        const updatedAt = Number(
          window.localStorage.getItem(`noteMeta:${id}:updatedAt`) ?? Date.now()
        );
        map.set(id, { content, updatedAt });
      }

      if (key.startsWith("draft:")) {
        const id = key.slice("draft:".length);
        const content = (await getDraftContent(id)) ?? "";
        const metaKey = `noteMeta:${id}:updatedAt`;
        const updatedAt = Number(window.localStorage.getItem(metaKey) ?? Date.now());
        const existing = map.get(id);
        if (!existing || updatedAt >= existing.updatedAt) {
          map.set(id, { content, updatedAt });
        }
      }
    }

    return map;
  };

  const handleSync = async (passphrase: string) => {
    if (typeof window === "undefined") return;
    if (isSyncInProgressRef.current) return;
    const trimmed = passphrase.trim();
    if (!trimmed) return;

    isSyncInProgressRef.current = true;
    try {
      const id = await generateBucketId(trimmed);
      const res = await fetch("/api/notes", {
        headers: {
          "X-Bucket-Id": id,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch remote notes");
      }
      const remoteNotes = (await res.json()) as { id: string; title: string; updatedAt: number }[];
      const remoteMap = new Map<string, { updatedAt: number }>();
      for (const note of remoteNotes) {
        remoteMap.set(note.id, { updatedAt: note.updatedAt });
      }

      const localMap = await getLocalNotesWithContent();

      const allIds = new Set<string>([
        ...Array.from(localMap.keys()),
        ...Array.from(remoteMap.keys()),
      ]);

      let hadSyncError = false;

      const safeSave = async (noteId: string, content: string) => {
        try {
          const saveRes = await fetch("/api/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bucket-Id": id,
            },
            body: JSON.stringify({ id: noteId, content }),
          });
          if (!saveRes.ok) {
            hadSyncError = true;
          }
        } catch {
          hadSyncError = true;
        }
      };

      const safeLoad = async (noteId: string) => {
        try {
          const noteRes = await fetch(`/api/note/${noteId}`, {
            headers: { "X-Bucket-Id": id },
          });
          if (!noteRes.ok) {
            hadSyncError = true;
            return null;
          }
          const full = (await noteRes.json()) as FullNote;
          return full;
        } catch {
          hadSyncError = true;
          return null;
        }
      };

      for (const idOfNote of allIds) {
        const local = localMap.get(idOfNote);
        const remote = remoteMap.get(idOfNote);

        if (local && remote) {
          if (local.updatedAt >= remote.updatedAt) {
            await safeSave(idOfNote, local.content);
          } else {
            const full = await safeLoad(idOfNote);
            if (full) {
              window.localStorage.setItem(`note:${idOfNote}`, full.content);
              window.localStorage.setItem(
                `noteMeta:${idOfNote}:updatedAt`,
                String(full.updatedAt)
              );
            }
          }
        } else if (local && !remote) {
          await safeSave(idOfNote, local.content);
        } else if (!local && remote) {
          const full = await safeLoad(idOfNote);
          if (full) {
            window.localStorage.setItem(`note:${idOfNote}`, full.content);
            window.localStorage.setItem(
              `noteMeta:${idOfNote}:updatedAt`,
              String(full.updatedAt)
            );
          }
        }
      }

      if (!hadSyncError) {
        setBucketId(id);
        setIsSynced(true);
        window.localStorage.setItem(BUCKET_ID_KEY, id);
        window.localStorage.setItem(IS_SYNCED_KEY, "true");
        void refetchNotes();
      }
    } catch {
      setIsSynced(false);
      window.localStorage.setItem(IS_SYNCED_KEY, "false");
    } finally {
      isSyncInProgressRef.current = false;
    }
  };

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

  const currentNote = orderedNotes.find((n) => n.id === activeId);
  const noteUpdatedAt = currentNote?.updatedAt ?? Date.now();

  if (isMobile === null) {
    return null;
  }

  return (
    <SearchIndexProvider notes={orderedNotes}>
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
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  Loading editor...
                </div>
              }
            >
              <LazyEditor content={content} onChange={setContent} />
            </Suspense>
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
        onSync={handleSync}
      />
    </SidebarLayout>
    </SearchIndexProvider>
  );
}

export default App;
