# Task 2: Add "Cetak Struk" in SalesHistoryPage

## Files
- Modify: `frontend/src/features/sales-history/SalesHistoryPage.tsx`

## What to do

### 1. Add ReceiptView import (after line 21)
Add after the existing imports:
```tsx
import { ReceiptView } from "@/features/pos/ReceiptView";
```

### 2. Add receiptSale state (after line 43)
After `const [voidLoading, setVoidLoading] = useState(false);`, add:
```tsx
const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
```

### 3. Add "Cetak Struk" button in desktop table actions (lines 155-172)
Replace the entire `actions` column render with:
```tsx
{
  key: "actions",
  label: "Aksi",
  render: (r) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
        Detail
      </Button>
      {r.status === "PENDING" && (
        <Button variant="primary" size="sm" onClick={() => navigate(`/pos?resume_payment=${r.id}`)}>
          Lanjutkan Pembayaran
        </Button>
      )}
      {r.status === "PAID" && (
        <Button variant="ghost" size="sm" onClick={() => setReceiptSale(r)}>
          Cetak Struk
        </Button>
      )}
      {isAdmin && r.status === "PAID" && (
        <Button variant="danger" size="sm" onClick={() => openVoid(r)}>
          Void
        </Button>
      )}
    </div>
  ),
},
```

### 4. Add "Cetak Struk" button in mobile card actions (lines 258-275)
Replace the mobile card action buttons section with:
```tsx
<div className="flex shrink-0 gap-1">
  <Button variant="ghost" size="sm" onClick={() => openDetail(s)}>
    Detail
  </Button>
  {s.status === "PENDING" && (
    <Button variant="primary" size="sm" onClick={() => navigate(`/pos?resume_payment=${s.id}`)}>
      Lanjutkan
    </Button>
  )}
  {s.status === "PAID" && (
    <Button variant="ghost" size="sm" onClick={() => setReceiptSale(s)}>
      Cetak
    </Button>
  )}
  {isAdmin && s.status === "PAID" && (
    <Button variant="danger" size="sm" onClick={() => openVoid(s)}>
      Void
    </Button>
  )}
</div>
```

### 5. Replace Void button in detail modal with combined Cetak Struk + Void (lines 380-386)
Replace:
```tsx
{isAdmin && detail.status === "PAID" && (
  <div className="flex justify-end">
    <Button variant="danger" onClick={() => openVoid(detail)}>
      Void Transaksi
    </Button>
  </div>
)}
```
With:
```tsx
{detail.status === "PAID" && (
  <div className="flex justify-end gap-2">
    <Button variant="secondary" onClick={() => setReceiptSale(detail)}>
      Cetak Struk
    </Button>
    {isAdmin && (
      <Button variant="danger" onClick={() => openVoid(detail)}>
        Void Transaksi
      </Button>
    )}
  </div>
)}
```

### 6. Add ReceiptView modal (after ConfirmDialog, around line 409)
Add before the closing `</div>` of the component:
```tsx
<Modal
  open={!!receiptSale}
  onClose={() => setReceiptSale(null)}
  title="Struk Pembayaran"
  size="lg"
>
  {receiptSale && (
    <ReceiptView
      sale={receiptSale}
      onClose={() => setReceiptSale(null)}
      customerName={receiptSale.customer?.name ?? ""}
    />
  )}
</Modal>
```

## Verification
Run `npm run build` in `frontend/` — must succeed with no TypeScript errors.

## Commit
```bash
git add frontend/src/features/sales-history/SalesHistoryPage.tsx
git commit -m "feat(history): add print receipt button for paid transactions"
```
