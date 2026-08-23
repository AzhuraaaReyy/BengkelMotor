import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon } from "@/components/shared/icons";
import { useNotifications } from "@/lib/useNotifications";
import { NotificationSection } from "./NotificationSection";

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCounts, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const stockNotifications = notifications.filter((n) => n.type === "STOCK");
  const transactionNotifications = notifications.filter((n) => n.type === "TRANSACTION");

  const hasUnread = unreadCounts.total > 0;
  const hasMarkableUnread = unreadCounts.transaction > 0;

  const handleClose = () => setOpen(false);
  const handleBellClick = () => setOpen((v) => !v);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        className="relative rounded-control p-2 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        onClick={handleBellClick}
        aria-label={`Notifikasi: ${unreadCounts.total} belum dibaca`}
      >
        <BellIcon className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCounts.total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-control border border-border bg-surface shadow-card">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">Notifikasi</p>
              <p className="text-xs text-text-secondary">
                {unreadCounts.total} belum dibaca
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasMarkableUnread && (
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                  onClick={handleMarkAllAsRead}
                >
                  Tandai semua dibaca
                </button>
              )}
              <button
                type="button"
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                onClick={handleClose}
                aria-label="Tutup notifikasi"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-text-tertiary">Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-text-tertiary">Tidak ada notifikasi</p>
              </div>
            ) : (
              <>
                <NotificationSection
                  title="Peringatan Stok"
                  notifications={stockNotifications}
                  onMarkAsRead={markAsRead}
                  emptyMessage="Stok aman"
                />
                <NotificationSection
                  title="Transaksi"
                  notifications={transactionNotifications}
                  onMarkAsRead={markAsRead}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-3">
            <button
              className="w-full rounded-control bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              onClick={() => {
                setOpen(false);
                navigate("/riwayat");
              }}
            >
              Lihat Riwayat Transaksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
