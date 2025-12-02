import { useRef, useEffect, useState, memo } from "react";
import type React from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useSwipeable } from "react-swipeable";
import type { Note } from "../types";
import { getShortDate } from "../utils/date";
import { previewContent } from "../utils/preview";
import { SwipeActions } from "./SwipeActions";

interface NoteItemProps {
  note: Note;
  activeId: string | null;
  onSelect: (id: string) => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
  onDelete?: (id: string) => void;
  isSearching: boolean;
  isHighlighted: boolean;
  showDivider: boolean;
  isMobile: boolean;
  openSwipeItemId: string | null;
  setOpenSwipeItemId: (id: string | null) => void;
  searchQuery?: string;
}

// Helper to highlight search terms (handles multiple matches)
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);
  
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    
    // Add highlighted match
    parts.push(
      <mark key={index} className="bg-accent/30 text-foreground rounded px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
    );
    
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
}

function getLocalContent(id: string): string {
  if (typeof window === "undefined") return "";
  const draft = window.localStorage.getItem(`draft:${id}`);
  if (draft !== null) return draft;
  const saved = window.localStorage.getItem(`note:${id}`);
  if (saved !== null) return saved;
  return "";
}

export const NoteItem = memo(function NoteItem({
  note,
  activeId,
  onSelect,
  pinnedIds,
  onTogglePin,
  onDelete,
  isSearching,
  isHighlighted,
  showDivider,
  isMobile,
  openSwipeItemId,
  setOpenSwipeItemId,
  searchQuery,
}: NoteItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const isActive = activeId === note.id;
  const isPinned = pinnedIds.has(note.id);
  const isSwipeOpen = openSwipeItemId === note.id;
  const content = getLocalContent(note.id);
  const preview = previewContent(content);
  const date = getShortDate(note.updatedAt);

  // Auto-scroll to active note
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isActive]);

  const handlers = useSwipeable({
    onSwipeStart: () => {
      if (isMobile) {
        setIsSwiping(true);
      }
    },
    onSwiped: () => {
      setIsSwiping(false);
    },
    onSwipedLeft: () => {
      if (isMobile) {
        setOpenSwipeItemId(note.id);
        setIsSwiping(false);
      }
    },
    onSwipedRight: () => {
      if (isMobile) {
        setOpenSwipeItemId(null);
        setIsSwiping(false);
      }
    },
    trackMouse: false,
  });

  const [isSwiping, setIsSwiping] = useState(false);

  // Prevent scroll when swiping on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    const preventDefault = (e: TouchEvent) => {
      if (isSwiping) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventDefault, { passive: false });
    return () => {
      document.removeEventListener("touchmove", preventDefault);
    };
  }, [isSwiping, isMobile]);

  const handlePin = () => {
    onTogglePin(note.id);
    setOpenSwipeItemId(null);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(note.id);
      setOpenSwipeItemId(null);
    }
  };

  // Extract ref from handlers if it exists
  const { ref: swipeRef, ...swipeHandlers } = handlers as any;

  const NoteContent = (
    <li
      data-note-id={note.id}
      {...swipeHandlers}
      ref={(node) => {
        itemRef.current = node;
        if (swipeRef) {
          if (typeof swipeRef === 'function') {
            swipeRef(node);
          } else if (swipeRef) {
            swipeRef.current = node;
          }
        }
      }}
      className={`relative h-[70px] w-full overflow-hidden ${
        (isSearching && isHighlighted) || (!isSearching && isActive)
          ? "bg-[var(--highlight)] text-[var(--highlight-text)] rounded-md"
          : ""
      } ${
        showDivider && !isActive && !isHighlighted
          ? 'after:content-[""] after:block after:mx-2 after:border-t after:border-muted-foreground/20'
          : ""
      }`}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            className={`h-full w-full transition-transform duration-300 ease-out ${
              isSwipeOpen ? "transform -translate-x-32" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(note.id)}
              className="block py-2 h-full w-full flex flex-col justify-center text-left"
            >
              <h2 className="text-sm font-bold px-2 break-words line-clamp-1">
                {isSearching && searchQuery
                  ? highlightText(note.title || "Untitled", searchQuery)
                  : note.title || "Untitled"}
              </h2>
              <p
                className={`text-xs pl-2 break-words line-clamp-1 ${
                  isActive || isHighlighted
                    ? "text-muted-foreground dark:text-white/80"
                    : "text-muted-foreground"
                }`}
              >
                <span>{date}</span>
                {preview && (
                  <span className="ml-2">
                    • {isSearching && searchQuery ? highlightText(preview, searchQuery) : preview}
                  </span>
                )}
              </p>
            </button>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content 
            className="min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-lg"
            style={{ animation: 'none', transform: 'none', transition: 'none' }}
          >
            <ContextMenu.Item
              className="flex items-center px-3 py-1.5 text-sm text-popover-foreground outline-none cursor-pointer hover:bg-accent focus:bg-accent"
              onSelect={handlePin}
            >
              {isPinned ? "Unpin" : "Pin"}
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* Swipe actions for mobile */}
      {isMobile && (
        <SwipeActions
          isOpen={isSwipeOpen}
          onPin={handlePin}
          onDelete={handleDelete}
          isPinned={isPinned}
        />
      )}
    </li>
  );

  return NoteContent;
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.activeId === nextProps.activeId &&
    prevProps.isSearching === nextProps.isSearching &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.showDivider === nextProps.showDivider &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.openSwipeItemId === nextProps.openSwipeItemId &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.pinnedIds.has(prevProps.note.id) === nextProps.pinnedIds.has(nextProps.note.id)
  );
});

