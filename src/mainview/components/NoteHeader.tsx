import { formatDate } from "../utils/date";

interface NoteHeaderProps {
  updatedAt: number;
}

export function NoteHeader({ updatedAt }: NoteHeaderProps) {
  const formattedDate = formatDate(updatedAt);

  return (
    <span className="text-xs text-muted-foreground transition-colors">
      {formattedDate}
    </span>
  );
}

