# Local Data Persistence Features

This document outlines the local data persistence features that have been added to the TipTap editor implementation.

## Overview

The editor now automatically saves content to `localStorage` and provides manual controls for managing saved content. This ensures users don't lose their work when the browser is refreshed or closed.

## Features

### 1. Automatic Persistence
- **Auto-save**: Content is automatically saved to localStorage with a 1-second debounce
- **Auto-load**: Saved content is automatically loaded when the editor initializes
- **Change detection**: Only saves when content has actually changed
- **Error handling**: Graceful handling of localStorage errors

### 2. Persistence Indicator
The editor displays a persistence status indicator showing:
- **"Saving..."** - When content is being saved (with spinning icon)
- **"Unsaved changes"** - When there are changes not yet saved (yellow)
- **"Saved X ago"** - When content was last saved (green)
- **"No saved content"** - When no content has been saved yet (gray)

### 3. Manual Controls
Toolbar buttons for manual persistence management:
- **Save button** - Manually save current content
- **Load button** - Load previously saved content (only enabled when saved content exists)
- **Clear button** - Delete saved content from localStorage (only visible when saved content exists)

## Implementation Details

### Core Hook: `useEditorPersistence`
Located at `@/hooks/use-editor-persistence.ts`

**Configuration options:**
```typescript
{
  storageKey?: string          // localStorage key (default: "tiptap-editor-content")
  debounceMs?: number         // Auto-save delay (default: 1000ms)
  autoSave?: boolean          // Enable auto-save (default: true)
  onSave?: (content: string) => void    // Save callback
  onLoad?: (content: string) => void    // Load callback
  onError?: (error: Error) => void      // Error callback
}
```

**Returned state and actions:**
```typescript
{
  // State
  isSaving: boolean
  isLoading: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  
  // Actions
  save: () => void
  load: () => void
  clear: () => void
  hasSavedContent: () => boolean
  getLastSaved: () => Date | null
}
```

### UI Components

#### PersistenceIndicator
Shows current save status with visual feedback:
- Loading spinner during save operations
- Color-coded status messages
- Relative time display for last saved

#### PersistenceControls
Toolbar buttons for manual persistence management:
- Save, load, and clear actions
- Disabled states based on current status
- Accessibility labels and tooltips

### Data Storage Format
Content is stored in localStorage as:
```json
{
  "content": "...",        // JSON stringified TipTap document
  "timestamp": "..."       // ISO timestamp of when saved
}
```

## Integration

The persistence features are integrated into `SimpleEditor`:

1. **Hook initialization** with custom configuration
2. **Toolbar integration** with persistence controls
3. **Status display** with persistence indicator
4. **Automatic behavior** for save/load operations

## Browser Compatibility

- Uses `localStorage` API (supported in all modern browsers)
- Graceful degradation when localStorage is unavailable
- Error handling for quota exceeded scenarios

## Security Considerations

- Content is stored locally in the user's browser
- No server transmission of saved content
- Users can manually clear saved data
- Data persists until manually cleared or browser data is deleted

## Usage Example

The persistence features work automatically once integrated. Users can:

1. **Type content** - Automatically saved after 1 second of inactivity
2. **Refresh browser** - Content is restored on page load
3. **Manual save** - Use toolbar save button for immediate save
4. **Load previous** - Use toolbar load button to restore saved content
5. **Clear data** - Use toolbar clear button to remove saved content

## Performance

- **Debounced saves** prevent excessive localStorage writes
- **Content comparison** ensures saves only happen when needed
- **Efficient storage** using JSON format
- **Minimal UI impact** with optimized re-renders 