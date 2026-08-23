import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
} from "@/lib/api/notifications";
import type { Notification, NotificationCounts } from "@/types";
import { useVisibility } from "./useVisibility";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<NotificationCounts>({
    stock: 0,
    transaction: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { isVisible, subscribe } = useVisibility();

  const load = useCallback(async () => {
    try {
      const [notifs, counts] = await Promise.all([
        getNotificationsApi(),
        getUnreadCountApi(),
      ]);
      setNotifications(notifs);
      setUnreadCounts(counts);
    } catch {
      // Best-effort notification
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await markAsReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCounts((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch {
      // Best-effort
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadApi();
      setNotifications((prev) =>
        prev.map((n) =>
          n.type !== "STOCK" && !n.read_at
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCounts((prev) => ({
        ...prev,
        transaction: 0,
        total: prev.stock,
      }));
    } catch {
      // Best-effort
    }
  }, []);

  // Debounced refresh to prevent rapid successive calls
  const refreshDebounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(() => {
    if (refreshDebounced.current) return;
    refreshDebounced.current = setTimeout(() => {
      refreshDebounced.current = null;
      load();
    }, 500);
  }, [load]);

  // Initial load + navigation-based refresh
  useEffect(() => {
    load();
  }, [load, location.pathname]);

  // Refresh on tab focus (visibility API) - using shared listener
  useEffect(() => {
    return subscribe((visible) => {
      if (visible) load();
    });
  }, [load, subscribe]);

  // 60-second periodic poll (only when visible) - increased from 30s
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const startTimer = () => {
      timer = window.setInterval(() => {
        if (isVisible) load();
      }, 60_000); // 60 seconds instead of 30
    };
    const stopTimer = () => window.clearInterval(timer);
    if (isVisible) startTimer();
    return subscribe((visible) => {
      if (visible) startTimer();
      else stopTimer();
    });
  }, [load, subscribe, isVisible]);

  return { notifications, unreadCounts, loading, markAsRead, markAllAsRead, refresh };
}
