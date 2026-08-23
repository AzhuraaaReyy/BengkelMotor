import type { Notification } from "@/types";
import { NotificationItem } from "./NotificationItem";

interface Props {
  title: string;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  emptyMessage?: string;
}

export function NotificationSection({
  title,
  notifications,
  onMarkAsRead,
  emptyMessage = "Tidak ada notifikasi",
}: Props) {
  if (notifications.length === 0) {
    return (
      <div className="border-b border-border last:border-b-0">
        <div className="bg-surface-2 px-4 py-1.5">
          <span className="text-xs font-medium text-text-secondary">{title}</span>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-text-tertiary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-surface-2 px-4 py-1.5">
        <span className="text-xs font-medium text-text-secondary">
          {title} ({notifications.length})
        </span>
      </div>
      <ul className="divide-y divide-border">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <NotificationItem
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
