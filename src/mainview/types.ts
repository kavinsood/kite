export interface Note {
  id: string;
  title: string;
  updatedAt: number;
  /**
   * Cached preview of the note content, derived via previewContent(content).
   * This is metadata-only and should never require reading the full content blob
   * just to render the sidebar or search results.
   */
  preview?: string;
}

export interface FullNote {
  id: string;
  content: string;
  updatedAt: number;
  deleted?: boolean;
}


