# Task 1 Report: Fix "Lanjutkan Pembayaran" — PosPage reads resume_payment

## Status: DONE

## Changes Made

Modified `frontend/src/features/pos/PosPage.tsx`:

1. **Added `useSearchParams` import** (line 2) from `react-router-dom`
2. **Added `getSaleApi`** to the sales API import (line 13)
3. **Added `searchParams` state** via `useSearchParams()` hook (line 30)
4. **Added `useEffect`** (lines 85–105) that reads `resume_payment` query param, fetches the sale via `getSaleApi`, and sets `waitingPaymentSale` if status is PENDING — or shows an error toast otherwise. The query param is cleared in `finally` to prevent re-triggering on re-render.

## Verification

- `npm run build` passed with no TypeScript errors
- Commit: `5823065 fix(pos): read resume_payment query param to reopen pending payment`
