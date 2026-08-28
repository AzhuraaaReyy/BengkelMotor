import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
} from "@/lib/api/notifications";
import type { Notification, NotificationCounts } from "@/types";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export function useNotifications() {
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => getNotificationsApi(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every 60 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch unread counts
  const { data: unreadCounts = { stock: 0, transaction: 0, total: 0 }, isLoading: loadingCounts } = useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => getUnreadCountApi(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every 60 seconds
    refetchOnWindowFocus: true,
  });

  const loading = loadingNotifs || loadingCounts;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsReadApi,
    onMutate: async (id) => {
      // Optimistically update notifications
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

      const previousNotifs = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);
      const previousCounts = queryClient.getQueryData<NotificationCounts>(UNREAD_COUNT_QUERY_KEY);

      const target = previousNotifs?.find((n) => n.id === id);
      const isStock = target?.type === "STOCK";

      // Update notifications
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (old = []) =>
        isStock
          ? old.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
          : old.filter((n) => n.id !== id)
      );

      // Update counts
      queryClient.setQueryData<NotificationCounts>(UNREAD_COUNT_QUERY_KEY, (old) => {
        if (!old) return { stock: 0, transaction: 0, total: 0 };
        return {
          ...old,
          transaction: isStock ? old.transaction : Math.max(0, old.transaction - 1),
          total: Math.max(0, old.total - 1),
        };
      });

      return { previousNotifs, previousCounts };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousNotifs) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousNotifs);
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.previousCounts);
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsReadApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

      const previousNotifs = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);
      const previousCounts = queryClient.getQueryData<NotificationCounts>(UNREAD_COUNT_QUERY_KEY);

      // Keep only STOCK notifications
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (old = []) =>
        old.filter((n) => n.type === "STOCK")
      );

      // Reset transaction count
      queryClient.setQueryData<NotificationCounts>(UNREAD_COUNT_QUERY_KEY, (old) => {
        if (!old) return { stock: 0, transaction: 0, total: 0 };
        return {
          stock: old.stock,
          transaction: 0,
          total: old.stock,
        };
      });

      return { previousNotifs, previousCounts };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifs) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousNotifs);
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.previousCounts);
      }
    },
  });

  const markAsRead = useCallback(
    async (id: number) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
  }, [queryClient]);

  return { notifications, unreadCounts, loading, markAsRead, markAllAsRead, refresh };
}
