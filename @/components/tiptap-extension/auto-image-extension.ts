import { Extension } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"

// Regex to match image URLs (http/https with common image extensions)
const IMAGE_URL_REGEX = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i

export const AutoImage = Extension.create({
  name: 'autoImage',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoImagePaste'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain')
            
            if (text && IMAGE_URL_REGEX.test(text.trim())) {
              const url = text.trim()
              const { tr } = view.state
              
              // Try to use our custom imageNode first, fallback to default image
              const nodeType = view.state.schema.nodes.imageNode || view.state.schema.nodes.image
              
              tr.replaceSelectionWith(
                nodeType.create({
                  src: url,
                  alt: '',
                })
              )
              
              view.dispatch(tr)
              return true
            }
            
            return false
          },
        },
      }),
    ]
  },
})

export default AutoImage 