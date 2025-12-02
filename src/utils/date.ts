/**
 * Formats a timestamp (number) into a readable date string
 * Example: "January 15, 2024 at 3:45 PM"
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  const formatted = date.toLocaleDateString("en-US", options);
  // Add "at" between date and time if not already present
  // toLocaleDateString with these options should produce: "January 15, 2024, 3:45 PM"
  // We want: "January 15, 2024 at 3:45 PM"
  return formatted.replace(", ", " at ").replace(",", "");
}

/**
 * Gets a short relative date for sidebar display
 * Examples: "Today", "Yesterday", "Jan 15", "Dec 1, 2023"
 */
export function getShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - noteDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}

