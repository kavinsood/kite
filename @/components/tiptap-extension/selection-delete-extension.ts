import { Extension } from "@tiptap/react"
import { Plugin } from "@tiptap/pm/state"

export const SelectionDelete = Extension.create({
  name: "selectionDelete",
  
  priority: 1000, // High priority to run before other keymap handlers

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            // Only handle Backspace and Delete keys
            if (event.key !== 'Backspace' && event.key !== 'Delete') {
              return false
            }

            // Only handle when there's a non-empty selection
            if (view.state.selection.empty) {
              return false
            }

            // Delete the selection immediately
            const { tr } = view.state
            tr.deleteSelection()
            view.dispatch(tr)
            
            // Prevent other handlers from running
            return true
          }
        }
      })
    ]
  }
})

export default SelectionDelete 