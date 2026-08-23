# Task 4 Report: NotificationController

**Status:** DONE

**Commit:** `626d26d` — `feat(notifications): add NotificationController for API endpoints`

**What was created:**
- `backend/app/Http/Controllers/Api/NotificationController.php` with 5 endpoints:
  - `index` — list notifications for user (optional `?type=` filter)
  - `unreadCount` — get unread counts grouped by type
  - `markAsRead` — mark single notification as read (ownership check)
  - `markAllAsRead` — mark all user notifications as read
  - `destroy` — delete a notification (ownership check)

**Concerns:**
- Depends on `NotificationService` (from Task 1) and `Notification` model (from Task 2). Ensure those are in place.
- Route registration not included — add routes in `routes/api.php` when wiring up endpoints.
