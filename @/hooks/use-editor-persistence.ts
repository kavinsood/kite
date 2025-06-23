import * as React from "react"
import type { Editor } from "@tiptap/react"

export interface EditorPersistenceOptions {
  /** Storage key for the editor content */
  storageKey?: string
  /** Debounce delay for autosave in milliseconds */
  debounceMs?: number
  /** Whether to enable autosave */
  autoSave?: boolean
  /** Callback when content is saved */
  onSave?: (content: string) => void
  /** Callback when content is loaded */
  onLoad?: (content: string) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export interface EditorPersistenceActions {
  /** Manually save the current editor content */
  save: () => void
  /** Load content from storage */
  load: () => void
  /** Clear stored content */
  clear: () => void
  /** Check if there's saved content */
  hasSavedContent: () => boolean
  /** Get the last saved timestamp */
  getLastSaved: () => Date | null
}

export interface EditorPersistenceState {
  /** Whether the editor is currently being saved */
  isSaving: boolean
  /** Whether content is currently being loaded */
  isLoading: boolean
  /** The last saved timestamp */
  lastSaved: Date | null
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
}

const DEFAULT_STORAGE_KEY = "tiptap-editor-content"
const DEFAULT_DEBOUNCE_MS = 1000

/**
 * Hook for managing TipTap editor content persistence with localStorage
 */
export function useEditorPersistence(
  editor: Editor | null,
  options: EditorPersistenceOptions = {}
): EditorPersistenceState & EditorPersistenceActions {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    autoSave = true,
    onSave,
    onLoad,
    onError,
  } = options

  const [isSaving, setIsSaving] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [lastSavedContent, setLastSavedContent] = React.useState<string>("")

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const getStorageData = React.useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const data = JSON.parse(stored)
      return {
        content: data.content || "",
        timestamp: data.timestamp ? new Date(data.timestamp) : null,
      }
         } catch (error) {
       const errorObj = error instanceof Error ? error : new Error("Failed to parse stored editor content")
       onError?.(errorObj)
       return null
     }
   }, [storageKey, onError])

  const saveToStorage = React.useCallback(
    (content: string) => {
      try {
        const data = {
          content,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem(storageKey, JSON.stringify(data))
        const timestamp = new Date()
        setLastSaved(timestamp)
        setLastSavedContent(content)
        setHasUnsavedChanges(false)
        onSave?.(content)
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error("Failed to save editor content to localStorage")
        onError?.(errorObj)
      }
    },
    [storageKey, onSave, onError]
  )

  const save = React.useCallback(() => {
    if (!editor) return

    setIsSaving(true)
    try {
      const content = editor.getJSON()
      const contentString = JSON.stringify(content)
      saveToStorage(contentString)
    } finally {
      setIsSaving(false)
    }
  }, [editor, saveToStorage])

  const load = React.useCallback(() => {
    if (!editor) return

    setIsLoading(true)
    try {
      const stored = getStorageData()
      if (stored?.content) {
        const content = JSON.parse(stored.content)
        editor.commands.setContent(content, false)
        setLastSaved(stored.timestamp)
        setLastSavedContent(stored.content)
        setHasUnsavedChanges(false)
        onLoad?.(stored.content)
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error("Failed to load editor content from localStorage")
      onError?.(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [editor, getStorageData, onLoad, onError])

  const clear = React.useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setLastSaved(null)
      setLastSavedContent("")
      setHasUnsavedChanges(false)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error("Failed to clear stored editor content")
      onError?.(errorObj)
    }
  }, [storageKey, onError])

  const hasSavedContent = React.useCallback(() => {
    const stored = getStorageData()
    return !!stored?.content
  }, [getStorageData])

  const getLastSaved = React.useCallback(() => {
    const stored = getStorageData()
    return stored?.timestamp || null
  }, [getStorageData])

  // Auto-save functionality
  React.useEffect(() => {
    if (!editor || !autoSave) return

    const handleUpdate = () => {
      const currentContent = JSON.stringify(editor.getJSON())
      
      // Check if content has actually changed
      if (currentContent !== lastSavedContent) {
        setHasUnsavedChanges(true)
        
        // Clear existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
          saveToStorage(currentContent)
        }, debounceMs)
      }
    }

    editor.on("update", handleUpdate)

    return () => {
      editor.off("update", handleUpdate)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [editor, autoSave, debounceMs, saveToStorage, lastSavedContent])

  // Load content on mount
  React.useEffect(() => {
    if (editor && hasSavedContent()) {
      load()
    }
  }, [editor, load, hasSavedContent])

  // Initialize last saved timestamp on mount
  React.useEffect(() => {
    const stored = getStorageData()
    if (stored?.timestamp) {
      setLastSaved(stored.timestamp)
    }
  }, [getStorageData])

  return {
    isSaving,
    isLoading,
    lastSaved,
    hasUnsavedChanges,
    save,
    load,
    clear,
    hasSavedContent,
    getLastSaved,
  }
} 