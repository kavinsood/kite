import { useEffect } from 'react';
import type { Note } from '../types';

interface UseShortcutsOptions {
  activeId: string | null;
  orderedNotes: Note[];
  isCommandOpen: boolean;
  onSelectNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: () => void;
  onOpenCommand: () => void;
  onToggleSidebar: () => void;
}

/**
 * Hook that handles keyboard shortcuts for note navigation and commands.
 * Extracted from App.tsx to separate concerns.
 */
export function useShortcuts({
  activeId,
  orderedNotes,
  isCommandOpen,
  onSelectNote,
  onTogglePin,
  onDelete,
  onOpenCommand,
  onToggleSidebar,
}: UseShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping =
        ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;

      // Allow Ctrl/Cmd+K even while typing
      const isCommandShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      // Allow Ctrl/Cmd+/ to toggle sidebar even while typing
      const isSidebarToggleShortcut =
        (event.metaKey || event.ctrlKey) && event.key === "/";

      if (isSidebarToggleShortcut) {
        event.preventDefault();
        event.stopPropagation();
        onToggleSidebar();
        return;
      }

      if (isTyping && !isCommandShortcut) {
        return;
      }

      if (isCommandShortcut) {
        event.preventDefault();
        onOpenCommand();
        return;
      }

      if (event.metaKey || event.ctrlKey || isCommandOpen) {
        return;
      }

      const key = event.key;

      if (!orderedNotes.length) return;

      const currentIndex = activeId
        ? orderedNotes.findIndex((n) => n.id === activeId)
        : -1;

      if (key === "j" || key === "ArrowDown") {
        event.preventDefault();
        const nextIndex =
          currentIndex >= 0 && currentIndex < orderedNotes.length - 1
            ? currentIndex + 1
            : 0;
        const next = orderedNotes[nextIndex];
        if (next) {
          onSelectNote(next.id);
        }
        return;
      }

      if (key === "k" || key === "ArrowUp") {
        event.preventDefault();
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : orderedNotes.length - 1;
        const prev = orderedNotes[prevIndex];
        if (prev) {
          onSelectNote(prev.id);
        }
        return;
      }

      if (key.toLowerCase() === "p" && activeId) {
        event.preventDefault();
        onTogglePin(activeId);
        return;
      }

      if (key.toLowerCase() === "d" && activeId) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId, orderedNotes, isCommandOpen, onSelectNote, onTogglePin, onDelete, onOpenCommand, onToggleSidebar]);
}

