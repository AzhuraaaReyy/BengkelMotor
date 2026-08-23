# Task 6: Dispatch Notifications on Sale Events

**Status:** DONE  
**Commit:** `fc6598a` - feat(notifications): dispatch notifications on sale events

## Changes Made

| File | Event | Notification Type |
|------|-------|-------------------|
| `CheckoutSaleService.php` | Successful cash checkout | TRANSACTION |
| `VoidSaleService.php` | Sale voided by admin | TRANSACTION |
| `PaymentService.php` | Payment expired | SYSTEM |

## Details

### CheckoutSaleService
Added `NotificationService->create()` call after audit log in the cash path (after stock ledger decrement, before return). Notifies the cashier when a transaction is successfully paid.

### VoidSaleService
Added `NotificationService->create()` call after audit log. Notifies the admin user who voided the sale. Includes void reason in metadata.

### PaymentService
Added `NotificationService->create()` call in `expire()` method after audit log. Notifies `$sale->cashier` when a pending payment expires.

## Concerns

None. All three files have access to the required `$user`/`$cashier` variable, and `NotificationService::create()` is resolved via `app()` to avoid constructor dependency changes.
