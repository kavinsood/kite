import type { Note } from "../types";

interface SidebarProps {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
}

export function Sidebar({
  notes,
  activeId,
  onSelect,
  onCreate,
  pinnedIds,
  onTogglePin,
}: SidebarProps) {
  return (
    <div className="flex h-screen w-80 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
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
          className="rounded-md border border-border bg-bg px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted transition-colors hover:border-muted hover:text-text"
        >
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelect(note.id)}
            className={`flex w-full cursor-pointer items-center border-l-2 px-3 py-2 text-left text-sm transition-colors ${
              activeId === note.id
                ? "border-white bg-white/5 text-white"
                : "border-transparent text-muted hover:bg-white/5 hover:text-text"
            }`}
          >
            <span className="flex-1 truncate text-sm">
              {note.title || "Untitled"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id);
              }}
              className={`ml-2 text-xs transition-colors ${
                pinnedIds.has(note.id)
                  ? "text-accent"
                  : "text-muted hover:text-accent"
              }`}
              aria-label={pinnedIds.has(note.id) ? "Unpin note" : "Pin note"}
            >
              {pinnedIds.has(note.id) ? "★" : "☆"}
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}


