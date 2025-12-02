import { useEffect } from "react";

export function useMobileKeyboard() {
  useEffect(() => {
    const preventZoom = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          );
        }
      }
    };

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

