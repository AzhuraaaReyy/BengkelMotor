## Task 9: useNotifications Hook

**Status:** DONE

**Commit:** `eb2302d` — `feat(notifications): add useNotifications hook with 30s polling`

**Created:** `frontend/src/lib/useNotifications.ts`

### What it does
- Polls `getNotificationsApi()` + `getUnreadCountApi()` on mount, navigation, tab focus, and every 30 seconds (when visible)
- `markAsRead(id)` — optimistically marks a single notification as read
- `markAllAsRead()` — marks all non-STOCK notifications as read (preserves stock unread count)
- Exposes `{ notifications, unreadCounts, loading, markAsRead, markAllAsRead, refresh }`

### Concerns
- None. API functions and types already exist in the codebase. Hook follows the same patterns as `useLowStock`.
