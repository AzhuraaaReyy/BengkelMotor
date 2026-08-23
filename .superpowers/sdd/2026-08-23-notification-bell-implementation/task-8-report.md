# Task 8: Frontend API Client

## Status
DONE

## Commit
- Hash: 249e662
- Message: feat(notifications): add notifications API client

## Implementation
Created `frontend/src/lib/api/notifications.ts` with 5 API functions:
- `getNotificationsApi` - Fetch notifications with optional type filter
- `getUnreadCountApi` - Get unread notification counts
- `markAsReadApi` - Mark single notification as read
- `markAllAsReadApi` - Mark all notifications as read
- `deleteNotificationApi` - Delete a notification

## Concerns
None. API client uses existing `client` instance and type definitions.
