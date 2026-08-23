# Task 1: Remove Dismiss Logic from StockNotificationBell

## Files
- Modify: `frontend/src/components/stock/StockNotificationBell.tsx`

## Interfaces
- Consumes: `items: LowStockItem[]`, `counts: LowStockCounts` from `useLowStock`
- Produces: Bell UI with toggle dropdown, no dismiss logic

## Requirements

**Current state:** StockNotificationBell has dismiss logic using sessionStorage, X button dismisses, click-outside/Escape dismiss, "Sembunyikan 1 jam" button, isDismissed flag.

**Required changes:**
1. Remove SESSION_DISMISS_KEY constant
2. Remove isDismissed check from sessionStorage
3. Remove handleClose sessionStorage logic
4. Simplify handleBellClick to just toggle open
5. Update useEffect click-outside and Escape handlers to only close (no dismiss)
5. Remove isDismissed from render logic (dropdown condition, bell indicator, aria-label)
6. Remove "Sembunyikan 1 jam" button from footer
7. Remove isDismissed indicator on bell
8. Update dropdown condition from `!isDismissed && open` to just `open`
8. Update X button in header to only close (not dismiss)
9. Remove "Sembunyikan 1 jam" button from footer
9. Remove isDismissed indicator on bell
9. Update aria-label to not mention dismissed state

## Acceptance Criteria
- Bell component renders when items exist
- Bell click toggles dropdown open/close
- X button closes dropdown
- Click outside closes dropdown
- Escape key closes dropdown
- No sessionStorage "stockDismissSession" key created
- No "Sembunyikan 1 jam" button in dropdown
- No ✕ indicator on bell icon
- "Lihat Produk & Stok" button works
- Bell stays visible after dropdown close
- Bell hidden when no low stock items

## Files to Modify
- `frontend/src/components/stock/StockNotificationBell.tsx`

## Verification
- Run `npm run build` in frontend/ - must pass