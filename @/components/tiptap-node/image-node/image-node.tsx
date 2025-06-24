import * as React from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import "@/components/tiptap-node/image-node/image-node.scss"

export interface ImageNodeProps extends NodeViewProps {
  // Add any custom props if needed
}

export const ImageNode: React.FC<ImageNodeProps> = ({ node }) => {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const { src, alt } = node.attrs

  const handleLoad = React.useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = React.useCallback(() => {
    setIsLoading(false)
    setHasError(true)
  }, [])

  React.useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [src])

  return (
    <NodeViewWrapper className="tiptap-image-node">
      <div className="tiptap-image-container">
        {isLoading && (
          <div className="tiptap-image-loading">
            <div className="tiptap-image-spinner" />
            <span className="tiptap-image-loading-text">Loading image...</span>
          </div>
        )}
        
        {hasError && (
          <div className="tiptap-image-error">
            <div className="tiptap-image-error-icon">⚠️</div>
            <span className="tiptap-image-error-text">Failed to load image</span>
            <span className="tiptap-image-error-url">{src}</span>
          </div>
        )}

        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            display: isLoading || hasError ? 'none' : 'block'
          }}
          draggable={false}
        />
      </div>
    </NodeViewWrapper>
  )
}

export default ImageNode 