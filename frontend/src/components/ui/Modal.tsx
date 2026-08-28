import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "../shared/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  hideScrollbar?: boolean;
  contentClassName?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md lg:max-w-lg",
  lg: "max-w-2xl lg:max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
  hideScrollbar = false,
  contentClassName = "",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${sizes[size]} rounded-card bg-surface shadow-card max-h-[90vh] flex flex-col overflow-hidden`}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-surface">
            <h2 className="text-base font-semibold text-text-primary">
              {title}
            </h2>
            <button
              className="rounded p-1 text-text-secondary hover:bg-surface-2"
              onClick={onClose}
              aria-label="Tutup"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>
        )}

        {/* Area Body Modal dengan dukungan hide-scrollbar */}
        <div
          className={`max-h-[75vh] overflow-y-auto px-5 py-4 flex-1 ${
            hideScrollbar ? "hide-scrollbar" : ""
          } ${contentClassName}`}
        >
          {children}
        </div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-4 shrink-0 bg-surface">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
