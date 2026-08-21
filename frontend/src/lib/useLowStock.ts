import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLowStockApi } from "@/lib/api/products";
import type { LowStockCounts, LowStockItem } from "@/types";

// Shared low-stock state for the banner + topbar bell (Fase 3.2).
// Refreshed on mount, on every navigation (GET responses are cached 15s by
// the client), and by a lightweight 60s poll so the notification clears by
// itself once stock is restocked to >= 5.
export function useLowStock() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [counts, setCounts] = useState<LowStockCounts>({
    out_of_stock: 0,
    low: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const load = useCallback(async () => {
    try {
      const res = await getLowStockApi();
      setItems(Array.isArray(res?.items) ? res.items : []);
      setCounts(
        res?.counts ?? { out_of_stock: 0, low: 0, total: 0 },
      );
    } catch {
      // Best-effort notification; never disturb operations on failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return { items, counts, loading };
}