"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-[10px] border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_var(--shadow-strong)] backdrop:bg-black/70 backdrop:backdrop-blur-[2px]",
        width === "sm" && "max-w-[420px]",
        width === "md" && "max-w-[560px]",
        width === "lg" && "max-w-[760px]",
      )}
      aria-labelledby="modal-title"
    >
      <div className="flex items-start justify-between gap-6 border-b border-line-soft px-5 py-4">
        <div>
          <h2 id="modal-title" className="font-display text-[19px] font-medium tracking-[-0.02em]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-[54ch] text-[12px] leading-[1.55] text-ink-3">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={buttonClass({ variant: "ghost", size: "icon", className: "-mr-1 -mt-1" })}
          aria-label="Close dialog"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-5 py-5">{children}</div>
      {footer ? (
        <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3.5">{footer}</div>
      ) : null}
    </dialog>
  );
}
