import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { BellIcon } from "@/components/shared/icons";
import { formatQuantity } from "@/lib/formatters";
import type { LowStockCounts, LowStockItem } from "@/types";

// Topbar notification bell for low/out-of-stock products (Fase 3.2).
// Bell icon always shows if low stock exists. Dropdown toggles on bell click.
interface Props {
  items: LowStockItem[];
  counts: LowStockCounts;
}

export function StockNotificationBell({ items, counts }: Props) {
  // Early return BEFORE any hooks - React hooks must be called in same order
  if (!items?.length) return null;

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const safeItems = items ?? [];
  const outItems = safeItems.filter((i) => i.is_out);
  const lowItems = safeItems.filter((i) => !i.is_out);
  const total = counts?.total ?? safeItems.length;

  const handleClose = () => {
    setOpen(false);
  };

  const handleBellClick = () => {
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
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
        aria-label={`Notifikasi stok: ${total} produk bermasalah`}
      >
        <BellIcon className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-control border border-border bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">Peringatan Stok</p>
              <p className="text-xs text-text-secondary">
                {`${total} produk di bawah stok aman (stok < min_stock)`}
              </p>
            </div>
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
          <div className="max-h-80 overflow-y-auto">
            {outItems.length > 0 && (
              <StockSection
                title="Habis"
                tone="danger"
                items={outItems}
              />
            )}
            {lowItems.length > 0 && (
              <StockSection
                title="Menipis"
                tone="warning"
                items={lowItems}
              />
            )}
          </div>
          <div className="border-t border-border p-3">
            <button
              className="w-full rounded-control bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              onClick={() => {
                setOpen(false);
                navigate("/produk");
              }}
            >
              Lihat Produk & Stok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockSection({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "danger" | "warning";
  items: LowStockItem[];
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-surface-2 px-4 py-1.5">
        <Badge tone={tone}>{title}</Badge>
      </div>
      <ul className="divide-y divide-border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {i.name}
              </p>
              <p className="text-xs text-text-secondary">
                {i.sku} &middot; min {formatQuantity(i.min_stock)} {i.unit}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone === "danger" ? "text-danger" : "text-warning"}`}>
              {formatQuantity(i.current_stock)} {i.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}