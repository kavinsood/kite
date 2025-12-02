import { Pin, PinOff, Trash2 } from "lucide-react";

interface SwipeActionsProps {
  isOpen: boolean;
  onPin: () => void;
  onDelete: () => void;
  isPinned: boolean;
}

export function SwipeActions({
  isOpen,
  onPin,
  onDelete,
  isPinned,
}: SwipeActionsProps) {
  return (
    <div
      className={`absolute top-0 right-0 h-full flex items-center transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={onPin}
        className="bg-[#3293FC] text-white p-4 h-full w-16 flex items-center justify-center touch-manipulation active:opacity-80"
        aria-label={isPinned ? "Unpin note" : "Pin note"}
      >
        {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="bg-[#FF4539] text-white p-4 h-full w-16 flex items-center justify-center touch-manipulation active:opacity-80"
        aria-label="Delete note"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}

