# Task 1: Fix "Lanjutkan Pembayaran" — PosPage reads resume_payment

## Files
- Modify: `frontend/src/features/pos/PosPage.tsx` (lines 1, 12, 27-28, 79-81)

## What to do

### 1. Add useSearchParams import (line 1)
Add `useSearchParams` to the react-router-dom import. Current line 1 does NOT import from react-router-dom — it only imports from React. Add a new import line:

```tsx
import { useSearchParams } from "react-router-dom";
```

### 2. Add getSaleApi import (line 12)
Change the existing sales API import from:
```tsx
import { checkoutSaleApi, createSaleApi } from "@/lib/api/sales";
```
to:
```tsx
import { checkoutSaleApi, createSaleApi, getSaleApi } from "@/lib/api/sales";
```

### 3. Add searchParams state (after line 28)
Inside the `PosPage()` function, after `const toast = useToast();`, add:

```tsx
const [searchParams, setSearchParams] = useSearchParams();
```

### 4. Add useEffect for resume_payment (after line 81)
After the existing `useEffect(() => { load(); }, [load]);` block, add:

```tsx
useEffect(() => {
  const resumeId = searchParams.get("resume_payment");
  if (!resumeId) return;

  const resumeSale = async () => {
    try {
      const sale = await getSaleApi(Number(resumeId));
      if (sale.status === "PENDING") {
        setWaitingPaymentSale(sale);
      } else {
        toast.error("Transaksi sudah tidak aktif.");
      }
    } catch {
      toast.error("Gagal memuat transaksi.");
    } finally {
      setSearchParams({}, { replace: true });
    }
  };

  resumeSale();
}, [searchParams, setSearchParams]);
```

## Verification
Run `npm run build` in `frontend/` — must succeed with no TypeScript errors.

## Commit
```bash
git add frontend/src/features/pos/PosPage.tsx
git commit -m "fix(pos): read resume_payment query param to reopen pending payment"
```
