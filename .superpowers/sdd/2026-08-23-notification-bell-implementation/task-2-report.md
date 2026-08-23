# Task 2: Notification Model

## Status
DONE

## Commit
- **Hash:** 967ab52bfd884a40053f2a422ed75c6809ffb676
- **Message:** feat(notifications): add Notification Eloquent model

## Details
Created `backend/app/Models/Notification.php` with:
- `$fillable` for user_id, type, title, message, data, read_at, created_at
- `$casts` for data (array), read_at (datetime), created_at (datetime)
- `user()` BelongsTo relationship to User model
- `isRead()` helper method
- `markAsRead()` helper method

## Concerns
None.
