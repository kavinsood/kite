/* React import removed for automatic JSX runtime */
import { cn } from "@/lib/tiptap-utils"

export interface PersistenceIndicatorProps {
  isSaving?: boolean
  hasUnsavedChanges?: boolean
  lastSaved?: Date | null
  className?: string
}

export function PersistenceIndicator({
  isSaving = false,
  hasUnsavedChanges = false,
  lastSaved = null,
  className,
}: PersistenceIndicatorProps) {
  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) {
      return "Just now"
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getStatusText = () => {
    if (isSaving) {
      return "Saving..."
    }
    if (hasUnsavedChanges) {
      return "Unsaved changes"
    }
    if (lastSaved) {
      return `Saved ${formatLastSaved(lastSaved)}`
    }
    return "No saved content"
  }

  const getStatusColor = () => {
    if (isSaving) {
      return "text-blue-600 dark:text-blue-400"
    }
    if (hasUnsavedChanges) {
      return "text-yellow-600 dark:text-yellow-400"
    }
    if (lastSaved) {
      return "text-green-600 dark:text-green-400"
    }
    return "text-gray-500 dark:text-gray-400"
  }

  return (
    <div className={cn("flex items-center text-xs", className)}>
      <div className={cn("flex items-center gap-1", getStatusColor())}>
        {isSaving && (
          <svg
            className="w-3 h-3 animate-spin"
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
        )}
        <span>{getStatusText()}</span>
      </div>
    </div>
  )
} 