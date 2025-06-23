import { Button } from "@/components/tiptap-ui-primitive/button"
import { ToolbarGroup } from "@/components/tiptap-ui-primitive/toolbar"
import { TrashIcon } from "@/components/tiptap-icons/trash-icon"

export interface PersistenceControlsProps {
  onSave?: () => void
  onLoad?: () => void
  onClear?: () => void
  hasSavedContent?: boolean
  isLoading?: boolean
  isSaving?: boolean
  showSaveButton?: boolean
  showLoadButton?: boolean
  showClearButton?: boolean
  className?: string
}

const SaveIcon = () => (
  <svg
    className="w-4 h-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
)

const LoadIcon = () => (
  <svg
    className="w-4 h-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
)

export function PersistenceControls({
  onSave,
  onLoad,
  onClear,
  hasSavedContent = false,
  isLoading = false,
  isSaving = false,
  showSaveButton = true,
  showLoadButton = true,
  showClearButton = true,
  className,
}: PersistenceControlsProps) {
  return (
    <ToolbarGroup className={className}>
      {showSaveButton && (
        <Button
          data-style="ghost"
          onClick={onSave}
          disabled={isSaving}
          title="Save content"
          aria-label="Save editor content"
        >
          {isSaving ? (
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <SaveIcon />
          )}
        </Button>
      )}

      {showLoadButton && (
        <Button
          data-style="ghost"
          onClick={onLoad}
          disabled={!hasSavedContent || isLoading}
          title="Load saved content"
          aria-label="Load saved editor content"
        >
          {isLoading ? (
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <LoadIcon />
          )}
        </Button>
      )}

      {showClearButton && hasSavedContent && (
        <Button
          data-style="ghost"
          onClick={onClear}
          title="Clear saved content"
          aria-label="Clear saved editor content"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      )}
    </ToolbarGroup>
  )
} 