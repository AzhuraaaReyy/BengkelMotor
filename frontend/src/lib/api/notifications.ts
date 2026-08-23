import client from "./client";
import type { ApiResponse, Notification, NotificationCounts } from "@/types";

export async function getNotificationsApi(params?: { type?: string }): Promise<Notification[]> {
  const { data } = await client.get<ApiResponse<Notification[]>>("/notifications", { params });
  return data.data;
}

export async function getUnreadCountApi(): Promise<NotificationCounts> {
  const { data } = await client.get<ApiResponse<NotificationCounts>>("/notifications/unread-count");
  return data.data;
}

export async function markAsReadApi(id: number): Promise<void> {
  await client.post(`/notifications/${id}/read`);
}

export async function markAllAsReadApi(): Promise<void> {
  await client.post("/notifications/read-all");
}

export async function deleteNotificationApi(id: number): Promise<void> {
  await client.delete(`/notifications/${id}`);
}
