import { useEffect, useMemo, useState } from "react";
import { FilePlus, Trash2, Pin, PinOff, Link, Moon, Sun, ArrowUp, ArrowDown, Command } from "lucide-react";
import { useTheme } from "next-themes";
import type { Note } from "../types";
import { useSearchIndexContext } from "../hooks/SearchIndexContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  activeId: string | null;
  pinnedIds: Set<string>;
  onSelectNote: (id: string) => void;
  onCreate: () => void;
  onDelete: () => void;
  onTogglePin: (id: string) => void;
  onToggleSidebar?: () => void;
  onSync?: (passphrase: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  notes,
  activeId,
  pinnedIds,
  onSelectNote,
  onCreate,
  onDelete,
  onTogglePin,
  onToggleSidebar,
  onSync,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { setTheme, resolvedTheme } = useTheme();
  const { searchWithPositions } = useSearchIndexContext();

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      setIsSyncMode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const orderedNotes = useMemo(() => {
    const pinned = notes.filter((note) => pinnedIds.has(note.id));
    const others = notes.filter((note) => !pinnedIds.has(note.id));
    return [...pinned, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, pinnedIds]);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: "new",
        label: "New note",
        description: "Create a new note",
        icon: <FilePlus className="h-4 w-4" />,
        shortcut: "N",
        run: onCreate,
      },
      {
        id: "toggle-theme",
        label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        description: "Toggle between light and dark theme",
        icon: resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        shortcut: "T",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ];

    if (onSync) {
      items.push({
        id: "sync",
        label: isSyncMode ? "Enter passphrase" : "Enable sync",
        description: isSyncMode
          ? "Type your passphrase above and press Enter"
          : "Enter a passphrase to sync notes across devices",
        icon: <Command className="h-4 w-4" />,
        shortcut: "S",
        run: () => {
          setIsSyncMode(true);
          setQuery("");
          setHighlightedIndex(0);
        },
      });
    }

    if (onToggleSidebar) {
      items.push({
        id: "toggle-sidebar",
        label: "Toggle sidebar",
        description: "Show or hide the sidebar",
        icon: <Command className="h-4 w-4" />,
        shortcut: "Ctrl+/",
        run: onToggleSidebar,
      });
    }

    if (activeId) {
      const currentIndex = orderedNotes.findIndex((n) => n.id === activeId);
      const hasNext = currentIndex >= 0 && currentIndex < orderedNotes.length - 1;
      const hasPrev = currentIndex > 0;

      if (hasNext) {
        items.push({
          id: "move-down",
          label: "Move to next note",
          description: "Navigate to the next note",
          icon: <ArrowDown className="h-4 w-4" />,
          shortcut: "J",
          run: () => {
            const nextNote = orderedNotes[currentIndex + 1];
            if (nextNote) onSelectNote(nextNote.id);
            onClose();
          },
        });
      }

      if (hasPrev) {
        items.push({
          id: "move-up",
          label: "Move to previous note",
          description: "Navigate to the previous note",
          icon: <ArrowUp className="h-4 w-4" />,
          shortcut: "K",
          run: () => {
            const prevNote = orderedNotes[currentIndex - 1];
            if (prevNote) onSelectNote(prevNote.id);
            onClose();
          },
        });
      }

      items.push(
        {
          id: "delete",
          label: "Delete current note",
          description: "Permanently delete this note",
          icon: <Trash2 className="h-4 w-4" />,
          shortcut: "D",
          run: () => {
            onDelete();
            onClose();
          },
        },
        {
          id: "toggle-pin",
          label: pinnedIds.has(activeId) ? "Unpin current note" : "Pin current note",
          description: pinnedIds.has(activeId) ? "Remove from pinned notes" : "Pin to top of list",
          icon: pinnedIds.has(activeId) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
          shortcut: "P",
          run: () => {
            onTogglePin(activeId);
            onClose();
          },
        },
        {
          id: "copy-link",
          label: "Copy link to current note",
          description: "Copy the URL of this note to clipboard",
          icon: <Link className="h-4 w-4" />,
          run: () => {
            const url = `${window.location.origin}/n/${activeId}`;
            void navigator.clipboard.writeText(url);
            onClose();
          },
        }
      );
    }

    return items;
  }, [activeId, onCreate, onDelete, onTogglePin, pinnedIds, orderedNotes, onSelectNote, onToggleSidebar, resolvedTheme, setTheme, onSync, isSyncMode]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const noteResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return searchWithPositions(q, notes);
  }, [notes, query, searchWithPositions]);

  const items = [...filteredCommands, ...noteResults];
  const commandsCount = filteredCommands.length;
  const notesCount = noteResults.length;

  const handleRun = (item: CommandItem | Note) => {
    if ("run" in item) {
      item.run();
    } else {
      onSelectNote(item.id);
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const key = event.key.toLowerCase();
    const inputValue = (event.currentTarget as HTMLInputElement).value;
    const hasSearchText = inputValue.trim().length > 0;

    if (!hasSearchText && !event.ctrlKey && !event.metaKey && !event.shiftKey && !isSyncMode) {
      const command = commands.find(cmd => {
        if (!cmd.shortcut) return false;
        if (cmd.shortcut.toLowerCase().includes('ctrl+') || cmd.shortcut.toLowerCase().includes('cmd+')) {
          return false;
        }
        const shortcut = cmd.shortcut.toLowerCase().trim();
        return shortcut === key;
      });
      
      if (command) {
        event.preventDefault();
        if (command.id === "sync") {
          setIsSyncMode(true);
          setQuery("");
          setHighlightedIndex(0);
          return;
        }
        command.run();
        onClose();
        return;
      }
    }
    
    if (!items.length) return;
    if (event.key === "ArrowDown" || (event.key === "j" && hasSearchText)) {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp" || (event.key === "k" && hasSearchText)) {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (isSyncMode && onSync) {
        const passphrase = query.trim();
        if (passphrase) {
          onSync(passphrase);
          onClose();
          setIsSyncMode(false);
          setQuery("");
          setHighlightedIndex(0);
        }
        return;
      }
      const item = items[highlightedIndex];
      if (item) {
        handleRun(item as CommandItem | Note);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-24" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background shadow-xl opacity-100" style={{ backgroundColor: 'hsl(var(--background))' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search notes…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none border-none focus:outline-none focus:ring-0"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Try a different search term</p>
            </div>
          ) : (
            <ul>
              {items.map((item, index) => {
                const isCommand = "run" in item;
                const note = isCommand ? null : (item as Note);
                const isActive = index === highlightedIndex;
                return (
                  <li key={isCommand ? (item as CommandItem).id : (item as Note).id}>
                    {index === 0 && commandsCount > 0 && (
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Commands
                      </div>
                    )}
                    {index === commandsCount && notesCount > 0 && (
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Notes ({notesCount})
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRun(item as CommandItem | Note)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {isCommand ? (
                        <>
                          <div className="flex-shrink-0 text-muted-foreground">
                            {(item as CommandItem).icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {(item as CommandItem).label}
                            </div>
                            {(item as CommandItem).description && (
                              <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                                {(item as CommandItem).description}
                              </div>
                            )}
                          </div>
                          {(item as CommandItem).shortcut && (
                            <div className="flex-shrink-0">
                              <kbd className="px-2 py-0.5 text-xs font-mono bg-background border border-border rounded text-muted-foreground">
                                {(item as CommandItem).shortcut}
                              </kbd>
                            </div>
                          )}
                        </>
                       ) : note ? (
                         <>
                          <div className="flex-shrink-0 text-muted-foreground">
                            <FilePlus className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {note.title || "Untitled"}
                            </div>
                            <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                              Note
                            </div>
                          </div>
                          {pinnedIds.has(note.id) && (
                            <div className="flex-shrink-0">
                              <Pin className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                         </>
                       ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
