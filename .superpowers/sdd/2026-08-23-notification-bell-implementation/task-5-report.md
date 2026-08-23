# Task 5: API Routes - Report

## Status: DONE

## Commit
- **Hash:** `21aba5e`
- **Message:** `feat(notifications): add notification API routes`

## Changes
- Added `NotificationController` import to `backend/routes/api.php`
- Added 5 notification routes inside the `auth:sanctum` protected group

## Route List Output
```
GET|HEAD   api/v1/notifications                     -> NotificationController@index
POST       api/v1/notifications/read-all            -> NotificationController@markAllAsRead
GET|HEAD   api/v1/notifications/unread-count        -> NotificationController@unreadCount
DELETE     api/v1/notifications/{notification}      -> NotificationController@destroy
POST       api/v1/notifications/{notification}/read -> NotificationController@markAsRead

Showing [5] routes
```

## Concerns
- None. All routes registered successfully and are protected by `auth:sanctum`.
