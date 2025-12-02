import { useEffect } from "react";

/**
 * Hook to handle mobile keyboard behavior
 * - Prevents zoom on input focus (iOS)
 * - Adjusts viewport when keyboard appears
 */
export function useMobileKeyboard() {
  useEffect(() => {
    // Prevent zoom on input focus (iOS Safari)
    const preventZoom = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        // Set viewport meta tag to prevent zoom
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          );
        }
      }
    };

    // Restore viewport after blur
    const restoreViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        );
      }
    };

    document.addEventListener("focusin", preventZoom);
    document.addEventListener("focusout", restoreViewport);

    return () => {
      document.removeEventListener("focusin", preventZoom);
      document.removeEventListener("focusout", restoreViewport);
    };
  }, []);
}

