import { mergeAttributes, Node } from "@tiptap/react"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageNode as ImageNodeComponent } from "@/components/tiptap-node/image-node/image-node"

export interface ImageNodeOptions {
  inline: boolean
  allowBase64: boolean
  HTMLAttributes: Record<string, any>
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    imageNode: {
      /**
       * Add an image
       */
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType
    }
  }
}

export const ImageNodeExtension = Node.create<ImageNodeOptions>({
  name: "imageNode",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    }
  },

  inline() {
    return this.options.inline
  },

  group() {
    return this.options.inline ? "inline" : "block"
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : "img[src]:not([src^=\"data:\"])",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeComponent)
  },

  addKeyboardShortcuts() {
    return {
      // When image is selected, pressing Enter/ArrowDown moves to the next line
      Enter: ({ editor }) => {
        const { selection } = editor.state
        
        if (editor.isActive(this.name)) {
          // Insert a paragraph after the current node position
          const { $anchor } = selection
          const pos = $anchor.after()
          editor.chain()
            .insertContentAt(pos, { type: 'paragraph' })
            .setTextSelection(pos + 1)
            .run()
          return true
        }
        return false
      },
      
      ArrowDown: ({ editor }) => {
        if (editor.isActive(this.name)) {
          const { selection } = editor.state
          const { $anchor } = selection
          const pos = $anchor.after()
          
          // Try to move to the next block
          if (pos < editor.state.doc.content.size) {
            editor.chain().setTextSelection(pos).run()
            return true
          } else {
            // Insert a paragraph after the image
            editor.chain()
              .insertContentAt(pos, { type: 'paragraph' })
              .setTextSelection(pos + 1)
              .run()
            return true
          }
        }
        return false
      },
      
      ArrowUp: ({ editor }) => {
        if (editor.isActive(this.name)) {
          const { selection } = editor.state
          const { $anchor } = selection
          const pos = $anchor.before()
          
          if (pos >= 0) {
            editor.chain().setTextSelection(pos).run()
            return true
          }
        }
        return false
      },
    }
  },
})

export default ImageNodeExtension