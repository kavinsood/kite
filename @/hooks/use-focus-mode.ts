"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"

/**
 * Configuration options for focus mode behavior
 */
export interface FocusModeOptions {
  /**
   * The TipTap editor instance
   */
  editor: Editor | null
  /**
   * Delay in milliseconds before entering focus mode after typing starts
   * @default 1000
   */
  enterFocusDelay?: number
  /**
   * Delay in milliseconds before exiting focus mode after typing stops
   * @default 3000
   */
  exitFocusDelay?: number
  /**
   * Whether focus mode is enabled
   * @default true
   */
  enabled?: boolean
}

/**
 * Focus mode state
 */
export interface FocusModeState {
  /**
   * Whether focus mode is currently active
   */
  isFocusMode: boolean
  /**
   * Whether the user is currently typing
   */
  isTyping: boolean
  /**
   * Manually toggle focus mode
   */
  toggleFocusMode: () => void
  /**
   * Manually set focus mode state
   */
  setFocusMode: (enabled: boolean) => void
}

/**
 * Custom hook that provides focus mode functionality for the editor.
 * 
 * Focus mode hides the toolbar and fades interface elements when the user
 * is actively typing, creating a distraction-free writing experience.
 * 
 * The hook detects typing activity through editor transaction monitoring
 * and automatically enters/exits focus mode based on configurable delays.
 * 
 * @param options Configuration options for focus mode behavior
 * @returns Focus mode state and controls
 */
export function useFocusMode({
  editor,
  enterFocusDelay = 1000,
  exitFocusDelay = 3000,
  enabled = true,
}: FocusModeOptions): FocusModeState {
  const [isFocusMode, setIsFocusMode] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [manualFocusMode, setManualFocusMode] = React.useState<boolean | null>(null)
  
  const enterTimeoutRef = React.useRef<NodeJS.Timeout | undefined>()
  const exitTimeoutRef = React.useRef<NodeJS.Timeout | undefined>()
  const lastActivityRef = React.useRef<number>(0)

  // Clear timeouts helper
  const clearTimeouts = React.useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current)
      enterTimeoutRef.current = undefined
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = undefined
    }
  }, [])

  // Manual controls
  const toggleFocusMode = React.useCallback(() => {
    setManualFocusMode(prev => prev === null ? !isFocusMode : !prev)
  }, [isFocusMode])

  const setFocusMode = React.useCallback((focusEnabled: boolean) => {
    setManualFocusMode(focusEnabled)
  }, [])

  // Handle typing detection and focus mode transitions
  React.useEffect(() => {
    if (!editor || !enabled) {
      return
    }

    const handleUpdate = ({ editor: updatedEditor }: { editor: any }) => {
      console.log('Editor update detected!') // Debug log
      
      const now = Date.now()
      lastActivityRef.current = now
      
      // User is typing
      setIsTyping(true)
      console.log('Setting isTyping to true') // Debug log
      
      // Clear any existing exit timeout so the countdown restarts
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current)
        exitTimeoutRef.current = undefined
      }

      // If manual focus mode is set, respect that and do nothing else
      if (manualFocusMode !== null) {
        setIsFocusMode(manualFocusMode)
        return
      }

      // Schedule enter timeout only once per typing session
      if (!isFocusMode && !enterTimeoutRef.current) {
        console.log(`Scheduling focus mode entry in ${enterFocusDelay}ms`) // Debug log
        enterTimeoutRef.current = setTimeout(() => {
          console.log('Entering focus mode!') // Debug log
          setIsFocusMode(true)
          enterTimeoutRef.current = undefined // reset so future sessions can schedule again
        }, enterFocusDelay)
      }

      // Set timeout to clear typing indicator after inactivity
      exitTimeoutRef.current = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current

        if (timeSinceLastActivity >= exitFocusDelay - 100) {
          setIsTyping(false)
          // Do NOT exit focus mode here; toolbar will become visible via mouse movement.
        }
      }, exitFocusDelay)
    }

    const handleSelectionUpdate = () => {
      console.log('Selection update detected') // Debug log
      // Don't treat pure selection changes as typing activity
    }

    const handleFocus = () => {
      console.log('Editor focus detected') // Debug log
      // When editor gains focus, don't immediately change state
      // Let typing activity determine focus mode
    }

    const handleBlur = () => {
      console.log('Editor blur detected') // Debug log
      // When editor loses focus, exit focus mode immediately
      clearTimeouts()
      
      if (manualFocusMode === null) {
        setIsTyping(false)
        setIsFocusMode(false)
      }
    }

    // Listen to editor events (cast to any to avoid TS signature mismatch)
    const editorAny = editor as any
    editorAny.on('update', handleUpdate)
    editorAny.on('selectionUpdate', handleSelectionUpdate)
    editorAny.on('focus', handleFocus)
    editorAny.on('blur', handleBlur)

    return () => {
      editorAny.off('update', handleUpdate)
      editorAny.off('selectionUpdate', handleSelectionUpdate)
      editorAny.off('focus', handleFocus)
      editorAny.off('blur', handleBlur)
      clearTimeouts()
    }
  }, [editor, enabled, enterFocusDelay, exitFocusDelay, isFocusMode, isTyping, manualFocusMode, clearTimeouts])

  // Handle mouse movement and keyboard shortcuts for exiting focus mode
  React.useEffect(() => {
    if (!enabled || !isFocusMode) return

    const handleMouseMove = () => {
      // Any mouse movement should cancel the typing override so the toolbar can reappear
      if (isTyping) {
        setIsTyping(false)
      }
      // CSS :hover handles showing the toolbar
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Exit focus mode on certain key combinations
      if (e.key === 'Escape' || (e.metaKey && e.key === '/') || (e.ctrlKey && e.key === '/')) {
        setIsFocusMode(false)
        setIsTyping(false)
        clearTimeouts()
      }
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, isFocusMode, clearTimeouts])

  // Reset manual focus mode when enabled state changes
  React.useEffect(() => {
    if (!enabled) {
      setManualFocusMode(null)
      setIsFocusMode(false)
      setIsTyping(false)
      clearTimeouts()
    }
  }, [enabled, clearTimeouts])

  // Use manual focus mode if set, otherwise use automatic state
  const effectiveFocusMode = manualFocusMode !== null ? manualFocusMode : isFocusMode

  return {
    isFocusMode: effectiveFocusMode,
    isTyping,
    toggleFocusMode,
    setFocusMode,
  }
} 