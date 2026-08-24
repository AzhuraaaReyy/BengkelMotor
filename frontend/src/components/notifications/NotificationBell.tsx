import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BellIcon, CloseIcon } from "@/components/shared/icons";
import { useNotifications } from "@/lib/useNotifications";
import { NotificationSection } from "./NotificationSection";

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCounts, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Near real-time: selama pop-up terbuka, tarik data tiap 5 detik
    // agar notifikasi dari user lain ikut terlihat langsung.
    const fastPoll = setInterval(refresh, 5000);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearInterval(fastPoll);
    };
  }, [open, refresh]);

  return (
    <>
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

      {open &&
        createPortal(
          // Portal ke body: keluar dari stacking context sidebar (sticky),
          // sehingga pop-up selalu tampil DI ATAS konten POS apa pun.
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Overlay — sama dengan drawer keranjang POS */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Kartu pop-up */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifikasi"
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shrink-0">
                  <BellIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Notifikasi</h2>
                  <p className="text-[11px] text-slate-400">
                    {hasUnread
                      ? `${unreadCounts.total} belum dibaca`
                      : "Semua sudah dibaca"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasMarkableUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    Tandai dibaca
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  aria-label="Tutup notifikasi"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Konten */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
              {loading && notifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
                  Memuat notifikasi...
                </div>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
                  Belum ada notifikasi.
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
                    emptyMessage="Belum ada transaksi terbaru"
                  />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/riwayat");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.99]"
              >
                Lihat Riwayat Transaksi
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}