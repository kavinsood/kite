/**
 * Derives a title from note content.
 * Extracts the first line, strips markdown headers, and limits to 20 characters.
 * Returns "Untitled" if the result is empty.
 */
export function deriveTitle(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  const stripped = firstLine.replace(/^#+\s*/, "").trim();
  return (stripped.length > 0 ? stripped : "Untitled").slice(0, 20);
}

