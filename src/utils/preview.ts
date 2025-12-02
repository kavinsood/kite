/**
 * Extracts a clean preview text from markdown content
 * Removes images, links, markdown syntax, and formats for display
 */
export function previewContent(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, "") // Remove images
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to text
    .replace(/\[[ xX]\]/g, "") // Remove task checkboxes
    .replace(/[#*_~`>+\-]/g, "") // Remove markdown syntax
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim()
    .slice(0, 60); // Limit to 60 characters
}

/**
 * Gets the first line of content for preview
 */
export function getFirstLine(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  return previewContent(firstLine);
}

