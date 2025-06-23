import { Extension } from "@tiptap/react"

/**
 * Global keyboard shortcuts for common formatting commands.
 *
 * Ctrl / Cmd + B  → Bold
 * Ctrl / Cmd + I  → Italic
 * Ctrl / Cmd + U  → Underline
 *
 * Ctrl / Cmd + Shift + 1 → Heading 1
 * Ctrl / Cmd + Shift + 2 → Heading 2
 * Ctrl / Cmd + Shift + 3 → Heading 3
 * Ctrl / Cmd + Shift + 4 → Heading 4
 */
export const KeyboardShortcuts = Extension.create({
  name: "keyboardShortcuts",

  addKeyboardShortcuts() {
    return {
      // Inline marks
      "Mod-b": () => this.editor.commands.toggleBold(),
      "Mod-i": () => this.editor.commands.toggleItalic(),
      "Mod-u": () => this.editor.commands.toggleUnderline?.(),

      // Headings (levels 1-4)
      "Mod-Shift-1": () =>
        this.editor.commands.toggleHeading({ level: 1 }),
      "Mod-Shift-2": () =>
        this.editor.commands.toggleHeading({ level: 2 }),
      "Mod-Shift-3": () =>
        this.editor.commands.toggleHeading({ level: 3 }),
      "Mod-Shift-4": () =>
        this.editor.commands.toggleHeading({ level: 4 }),

      // Lists & links
      "Mod-Shift-b": () => this.editor.commands.toggleBulletList(),
      "Mod-Shift-k": () => this.editor.commands.toggleTaskList?.(),

      // Quick link prompt
      "Mod-Shift-l": () => {
        const { editor } = this
        const prevUrl: string | null = editor.getAttributes("link").href || null

        // Ask for the URL (using a simple prompt for now)
        const url = window.prompt("Enter URL", prevUrl ?? "https://")

        if (url === null) {
          // Cancelled — do nothing but keep focus
          return true
        }

        if (url === "") {
          // Empty string removes link
          return editor.commands.unsetLink()
        }

        return editor.commands.toggleLink({ href: url })
      },
    }
  },
})

export default KeyboardShortcuts 