import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon, CloseIcon } from "../shared/icons";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => {
    return {
      toast,
      success: (m: string) => toast(m, "success"),
      error: (m: string) => toast(m, "error"),
      info: (m: string) => toast(m, "info"),
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between gap-3 rounded-card border px-4 py-3 text-sm shadow-card ${
              t.tone === "success"
                ? "border-success/30 bg-white text-text-primary"
                : t.tone === "error"
                  ? "border-danger/30 bg-white text-text-primary"
                  : "border-border bg-white text-text-primary"
            }`}
          >
            <div className="flex items-start gap-2">
              {t.tone === "success" && (
                <CheckIcon className="mt-0.5 h-4 w-4 text-success" />
              )}
              {t.tone === "error" && (
                <span className="mt-0.5 h-4 w-4 text-danger">×</span>
              )}
              <span>{t.message}</span>
            </div>
            <button
              className="shrink-0 text-text-secondary hover:text-text-primary"
              onClick={() => dismiss(t.id)}
              aria-label="Tutup notifikasi"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
