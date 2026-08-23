# Task 2 Fix Report

**Date:** 2026-08-23  
**Issue:** SQL error at runtime in `Notification::markAsRead()`  
**Status:** Fixed

## Problem

The `markAsRead()` method in `Notification.php` calls `$this->update()`, which tries to set `updated_at`. However, the migration only defined `created_at` — no `updated_at` column existed, causing a SQL error.

## Root Cause

Migration file `2026_08_23_100000_create_notifications_table.php` used:
```php
$table->timestamp('created_at');
```
instead of Laravel's standard `$table->timestamps()`.

## Fix Applied

**File:** `backend/database/migrations/2026_08_23_100000_create_notifications_table.php`

Changed:
```php
$table->timestamp('created_at');
```
To:
```php
$table->timestamps();
```

This creates both `created_at` and `updated_at` columns automatically, matching Laravel's convention and supporting `$this->update()` calls.

## Verification

- Ran `php artisan migrate:fresh` — all migrations passed, including the fixed notifications table migration.
- No errors encountered.

## Commit

```
fix(notifications): add updated_at column to notifications table
```
