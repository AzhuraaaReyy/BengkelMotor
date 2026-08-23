import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
} from "@/lib/api/notifications";
import type { Notification, NotificationCounts } from "@/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<NotificationCounts>({
    stock: 0,
    transaction: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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

  // Initial load + navigation-based refresh
  useEffect(() => {
    load();
  }, [load, location.pathname]);

  // Refresh on tab focus (visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [load]);

  // 30-second periodic poll (only when visible)
  useEffect(() => {
    let timer: number;
    const startTimer = () => {
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") load();
      }, 30_000);
    };
    const stopTimer = () => window.clearInterval(timer);
    if (document.visibilityState === "visible") startTimer();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") startTimer();
      else stopTimer();
    });
    return () => {
      stopTimer();
    };
  }, [load]);

  return { notifications, unreadCounts, loading, markAsRead, markAllAsRead, refresh: load };
}
