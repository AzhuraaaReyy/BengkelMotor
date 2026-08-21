import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertIcon, CloseIcon } from "@/components/shared/icons";
import type { LowStockCounts, LowStockItem } from "@/types";

// First-level stock warning shown above the page content (Fase 3.2).
// Closing it (X) demotes the alert to the topbar bell only.
interface Props {
  items: LowStockItem[];
  counts: LowStockCounts;
  loading: boolean;
}

export function StockAlertBanner({ items, counts, loading }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !items?.length) return null;

  const hasOut = (counts?.out_of_stock ?? 0) > 0;
  const parts: string[] = [];
  if ((counts?.out_of_stock ?? 0) > 0) parts.push(`${counts.out_of_stock} produk habis`);
  if ((counts?.low ?? 0) > 0) parts.push(`${counts.low} produk menipis (stok < 5)`);

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-control border px-4 py-3 ${
        hasOut ? "border-danger bg-danger-subtle" : "border-warning bg-warning-subtle"
      }`}
    >
      <AlertIcon
        className={`mt-0.5 h-5 w-5 shrink-0 ${hasOut ? "text-danger" : "text-warning"}`}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className={`font-semibold ${hasOut ? "text-danger" : "text-warning"}`}>
          Peringatan stok {hasOut ? "habis" : "menipis"}
        </p>
        <p className="text-text-secondary">{parts.join(" dan ")}.</p>
        <button
          className="mt-1 font-medium text-primary"
          onClick={() => navigate("/produk")}
        >
          Lihat Produk & Stok &rarr;
        </button>
      </div>
      <button
        className="rounded p-1 text-text-secondary hover:bg-surface-2"
        onClick={() => setDismissed(true)}
        aria-label="Tutup peringatan stok"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}