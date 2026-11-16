"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone; leaving?: boolean };

const ToastContext = createContext<{
  showToast: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 180);
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      counter.current += 1;
      const id = counter.current;
      setToasts((items) => [...items.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[84px] right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? Check : toast.tone === "error" ? TriangleAlert : Info;
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-[8px] border bg-surface px-3.5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-[opacity,transform] duration-200 ease-out",
                toast.leaving ? "translate-y-1 opacity-0" : "enter-rise",
                toast.tone === "error" ? "border-[#5b2b2e]" : "border-line",
              )}
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                className={cn(
                  "mt-0.5 shrink-0",
                  toast.tone === "success" && "text-green",
                  toast.tone === "error" && "text-[#f0a1a5]",
                  toast.tone === "info" && "text-ink-2",
                )}
                aria-hidden="true"
              />
              <p className="flex-1 text-[12px] leading-[1.55] text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="mt-0.5 text-ink-3 hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
