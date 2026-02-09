"use client";

import * as React from "react";
import { CheckCircle2Icon, XCircleIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type Toast = {
  id: string;
  variant: ToastVariant;
  title?: string;
  description?: string;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, "id"> & { id?: string }) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (toast: Omit<Toast, "id"> & { id?: string }) => {
      const id = toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next: Toast = { id, ...toast };
      setToasts((prev) => [...prev, next]);
      // Auto-dismiss after 3 seconds
      setTimeout(() => remove(id), 3000);
    },
    [remove]
  );

  const success = React.useCallback(
    (message: string, description?: string) =>
      show({ variant: "success", title: message, description }),
    [show]
  );

  const error = React.useCallback(
    (message: string, description?: string) =>
      show({ variant: "error", title: message, description }),
    [show]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({ show, success, error }),
    [show, success, error]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-[90%] max-w-sm items-start gap-3 rounded-md border px-3 py-2 text-sm shadow-lg bg-background",
              toast.variant === "success" && "border-emerald-200 bg-emerald-950/5 text-emerald-900",
              toast.variant === "error" && "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            <div className="mt-0.5">
              {toast.variant === "success" ? (
                <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircleIcon className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              {toast.title && <div className="font-medium">{toast.title}</div>}
              {toast.description && (
                <div className="text-xs text-muted-foreground">{toast.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted/60"
            >
              <XIcon className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

