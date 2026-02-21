export function previewContent(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\[[ xX]\]/g, "")
    .replace(/[#*_~`>+\-]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60); // Limit to 60 characters
}

export function getFirstLine(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  return previewContent(firstLine);
}

