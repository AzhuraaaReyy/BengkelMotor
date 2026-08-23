# Task 13: Integrate NotificationBell in AppShell

## Status: DONE

## Commit
- **Hash:** `036f1b8`
- **Message:** `feat(notifications): integrate NotificationBell in AppShell`

## Changes
- Replaced `StockNotificationBell` import with `NotificationBell` from `@/components/notifications/NotificationBell`
- Replaced both `<StockNotificationBell items={...} counts={...} />` instances (desktop + mobile topbar) with `<NotificationBell />`
- Kept `useLowStock` import (still needed by `StockAlertBanner`)

## Build Result
- TypeScript errors exist but are **pre-existing** and unrelated to this change (PaymentMethod type mismatches in `PosPage.tsx` and `constants.ts`)
- No new errors introduced by this task

## Concerns
- None
