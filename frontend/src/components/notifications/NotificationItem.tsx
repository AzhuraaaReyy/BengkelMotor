import type { Notification } from "@/types";

interface Props {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: Props) {
  const isUnread = !notification.read_at;
  const icon = getIcon(notification.type);
  const timeAgo = getTimeAgo(notification.created_at);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2 ${
        isUnread ? "bg-primary/5" : ""
      }`}
      onClick={() => isUnread && onMarkAsRead(notification.id)}
    >
      <div className={`shrink-0 mt-0.5 ${icon.color}`}>
        {icon.element}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isUnread ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-text-secondary line-clamp-2">{notification.message}</p>
        <p className="mt-1 text-xs text-text-tertiary">{timeAgo}</p>
      </div>
      {isUnread && (
        <div className="shrink-0 mt-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "STOCK":
      return {
        color: "text-warning",
        element: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
      };
    case "TRANSACTION":
      return {
        color: "text-success",
        element: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    default:
      return {
        color: "text-info",
        element: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}
