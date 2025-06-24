import { Extension } from "@tiptap/react"
import { Plugin } from "@tiptap/pm/state"

export const CopySanitizer = Extension.create({
  name: "copySanitizer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            copy: (view, event) => {
              // Get the current selection
              const { from, to } = view.state.selection
              if (from === to) return false // No selection
              
              // Get the text content of the selection
              const text = view.state.doc.textBetween(from, to, '\n')
              
              if (text && event.clipboardData) {
                // Remove trailing backslashes before newlines (CommonMark soft breaks)
                const sanitized = text.replace(/\\\n/g, '\n')
                
                // Clear the clipboard and set our sanitized text
                event.clipboardData.clearData()
                event.clipboardData.setData('text/plain', sanitized)
                
                // Prevent the default copy behavior
                event.preventDefault()
                return true
              }
              
              return false
            }
          }
        }
      })
    ]
  }
})

export default CopySanitizer 