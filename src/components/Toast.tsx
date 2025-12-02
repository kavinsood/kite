import * as ToastPrimitive from "@radix-ui/react-toast";
import { createContext, useContext, useState, useCallback } from "react";
import { Icons } from "./Icons";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

interface ToastContextType {
  toast: (title: string, options?: { description?: string; variant?: "default" | "success" | "error" }) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (title: string, options?: { description?: string; variant?: "default" | "success" | "error" }) => {
      const id = crypto.randomUUID();
      const newToast: Toast = {
        id,
        title,
        description: options?.description,
        variant: options?.variant || "default",
      };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
      
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className="flex items-center gap-3 rounded-md border border-border bg-popover p-4 shadow-lg"
            onOpenChange={(open) => {
              if (!open) {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }
            }}
          >
            <ToastPrimitive.Title className="text-sm font-medium text-popover-foreground">
              {toast.title}
            </ToastPrimitive.Title>
            {toast.description && (
              <ToastPrimitive.Description className="text-xs text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close className="ml-auto text-muted-foreground hover:text-popover-foreground transition-colors">
              <Icons.X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col gap-2 p-4 md:max-w-[420px]" />
      </ToastPrimitive.Provider>
      {children}
    </ToastContext.Provider>
  );
}
