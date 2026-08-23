import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLowStockApi } from "@/lib/api/products";
import type { LowStockCounts, LowStockItem } from "@/types";
import { useVisibility } from "./useVisibility";

// Shared low-stock state for the banner + topbar bell (Fase 3.2).
// Refreshed on mount, on navigation, on tab focus (via visibility API),
// and by a 5-min poll so the notification clears once stock is restocked.
export function useLowStock() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [counts, setCounts] = useState<LowStockCounts>({
    out_of_stock: 0,
    low: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { isVisible, subscribe } = useVisibility();

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

  // Initial load + navigation-based refresh
  useEffect(() => {
    load();
  }, [load, location.pathname]);

  // Visibility-based refresh: load when tab becomes visible
  useEffect(() => {
    return subscribe((visible) => {
      if (visible) load();
    });
  }, [load, subscribe]);

  // Periodic poll: 5 minutes (only when tab is visible via visibility gate)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const startTimer = () => {
      timer = window.setInterval(() => {
        if (isVisible) load();
      }, 5 * 60_000); // 5 minutes
    };
    const stopTimer = () => window.clearInterval(timer);

    if (isVisible) startTimer();
    return subscribe((visible) => {
      if (visible) startTimer();
      else stopTimer();
    });
  }, [load, subscribe, isVisible]);

  return { items, counts, loading };
}