# Task 7: Frontend Types for Notifications

## Status: DONE

## Commit
- **Hash:** 203b2ff
- **Message:** feat(notifications): add notification TypeScript types

## Changes
Added to `frontend/src/types/index.ts`:
- `NotificationType` - union type for STOCK, TRANSACTION, SYSTEM
- `Notification` - interface with id, user_id, type, title, message, data, read_at, created_at
- `NotificationCounts` - interface with stock, transaction, system, total counts

## Concerns
None.
