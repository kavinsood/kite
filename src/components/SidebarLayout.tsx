import { useEffect } from "react";
import { useMobileDetect } from "../hooks/useMobileDetect";
import { EnhancedSidebar } from "./EnhancedSidebar";
import type { Note } from "../types";

interface SidebarLayoutProps {
  children: React.ReactNode;
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
  onDelete?: (id: string) => void;
  showSidebar: boolean;
  onBack?: () => void;
}

export function SidebarLayout({
  children,
  notes,
  activeId,
  onSelect,
  onCreate,
  pinnedIds,
  onTogglePin,
  onDelete,
  showSidebar,
}: SidebarLayoutProps) {
  const isMobile = useMobileDetect();

  // Auto-redirect to first note on desktop when no note is selected
  useEffect(() => {
    if (isMobile === false && !activeId && notes.length > 0) {
      onSelect(notes[0].id);
    }
  }, [isMobile, activeId, notes, onSelect]);

  if (isMobile === null) {
    return null; // Wait for mobile detection
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {showSidebar && (
        <EnhancedSidebar
          notes={notes}
          activeId={activeId}
          onSelect={onSelect}
          onCreate={onCreate}
          pinnedIds={pinnedIds}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          isMobile={isMobile}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {children}
      </div>
    </div>
  );
}

