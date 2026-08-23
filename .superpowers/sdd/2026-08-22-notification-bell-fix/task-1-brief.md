# Task 1: Update StockNotificationBell - Remove "Sembunyikan 1 jam" and Implement Session-Based Dismiss

## Files
- Modify: `frontend/src/components/stock/StockNotificationBell.tsx`

## Interfaces
- Consumes: `items: LowStockItem[]`, `counts: LowStockCounts` from `useLowStock`
- Produces: Bell UI with dropdown, session-based dismiss logic

## Requirements

**Current state:** StockNotificationBell has a "Sembunyikan 1 jam" button that sets localStorage with 1-hour expiry.

**Required changes:**
1. Remove DISMISS_DURATION_MS constant (1 hour)
3. Remove "Sembunyikan 1 jam" button from dropdown footer
4. Use sessionStorage key: "stockDismissSession" 
5. Check if current session is dismissed: `sessionStorage.getItem("stockDismissSession") === "true"` - if true, return null (don't render bell)
4. Close (X) button / clicking outside dropdown: sets `sessionStorage.setItem("stockDismissSession", "true")` and `setOpen(false)`
6. Remove "Sembunyikan 1 jam" button from dropdown footer - keep only "Lihat Produk & Stok" button
7. Keep auto-hide when `items.length === 0` (real-time stock check via useLowStock)

## Session Storage Logic
- Key: `stockDismissSession`
- Value: `"true"` (simple boolean flag for current session)
- Check on render: if `sessionStorage.getItem("stockDismissSession") === "true"` → return null
- On close (X) or click outside: `sessionStorage.setItem("stockDismissSession", "true")` + `setOpen(false)`

## Acceptance Criteria
- Bell component renders when items exist and not dismissed
- Clicking X or clicking outside closes dropdown AND sets sessionStorage flag
- Bell does not render again until sessionStorage key is cleared (logout)
- No "Sembunyikan 1 jam" button in dropdown
- Only "Lihat Produk & Stok" button in footer
- Auto-hides when no low stock items (items.length === 0)

## Files to Modify
- `frontend/src/components/stock/StockNotificationBell.tsx`

## Verification
- Run `npm run build` in frontend/ - must pass
- Manual test: login, trigger low stock, click X, verify bell hides, logout/login, verify bell reappears if low stock exists