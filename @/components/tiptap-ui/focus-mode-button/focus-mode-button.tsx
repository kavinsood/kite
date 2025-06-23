import * as React from "react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { useFocusMode, type FocusModeState } from "@/hooks/use-focus-mode"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import type { Editor } from "@tiptap/react"

// Focus mode icon - simplified eye/target icon
const FocusModeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6" />
    <path d="m21 12-6 0m-6 0-6 0" />
  </svg>
)

interface FocusModeButtonProps {
  /**
   * Optional editor instance. If not provided, will use editor from context
   */
  editor?: Editor | null
  /**
   * Optional focus mode state. If not provided, will use internal hook
   */
  focusMode?: FocusModeState
  /**
   * Button text to display alongside icon
   */
  text?: string
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Click handler (called before internal toggle)
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  /**
   * Whether to show focus mode controls
   * @default true
   */
  enabled?: boolean
}

/**
 * Button component for toggling focus mode in the editor.
 * 
 * Focus mode creates a distraction-free writing experience by hiding
 * the toolbar and other interface elements when the user is typing.
 */
export const FocusModeButton = React.forwardRef<
  HTMLButtonElement,
  FocusModeButtonProps
>(({
  editor: providedEditor,
  focusMode: providedFocusMode,
  text,
  className = "",
  onClick,
  enabled = true,
  ...buttonProps
}, ref) => {
  const editor = useTiptapEditor(providedEditor)
  
  // Use provided focus mode state or create our own
  const internalFocusMode = useFocusMode({
    editor,
    enabled: enabled && !providedFocusMode,
  })
  
  const focusMode = providedFocusMode || internalFocusMode
  const { isFocusMode, toggleFocusMode } = focusMode

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      
      if (!e.defaultPrevented && enabled) {
        toggleFocusMode()
      }
    },
    [onClick, enabled, toggleFocusMode]
  )

  if (!editor || !editor.isEditable || !enabled) {
    return null
  }

  const tooltip = isFocusMode ? "Exit focus mode" : "Enter focus mode"
  const ariaLabel = `${tooltip} (${isFocusMode ? 'on' : 'off'})`

  return (
    <Button
      ref={ref}
      type="button"
      className={className.trim()}
      data-style="ghost"
      data-active={isFocusMode}
      role="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-pressed={isFocusMode}
      tooltip={tooltip}
      onClick={handleClick}
      {...buttonProps}
    >
      <FocusModeIcon className="tiptap-button-icon" />
      {text && <span className="tiptap-button-text">{text}</span>}
    </Button>
  )
})

FocusModeButton.displayName = "FocusModeButton" 