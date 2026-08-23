### Task 7: Fix ReceiptView Responsive and Remove Dead Link

**Files:**
- Modify: `src/features/pos/ReceiptView.tsx:23, 130-141`

**Interfaces:**
- Consumes: Sale type, Button component
- Produces: Responsive receipt view with horizontal buttons on tablet

- [ ] **Step 1: Make receipt container wider on tablet**

Line 23 -- change:
```
mx-auto max-w-md
```
to:
```
mx-auto max-w-md lg:max-w-lg
```

- [ ] **Step 2: Make action buttons horizontal on tablet**

Line 130 -- change:
```
mt-4 flex flex-col gap-2 print:hidden
```
to:
```
mt-4 flex flex-col md:flex-row md:flex-wrap gap-2 print:hidden
```

- [ ] **Step 3: Make buttons equal width on tablet**

Line 131 -- add `md:flex-1` to each button:
```tsx
<Button variant="secondary" onClick={handlePrint} className="md:flex-1">
  <PrinterIcon className="h-4 w-4" />
  Cetak Nota
</Button>
<Button variant="secondary" onClick={onClose} className="md:flex-1">
  Transaksi Baru
</Button>
```

- [ ] **Step 4: Remove dead link to /servis**

Line 138-140 -- DELETE these lines:
```tsx
<Link to="/servis" className="btn-primary w-full">
  Daftar Servis
</Link>
```

Also remove the unused import on line 7:
```tsx
// BEFORE:
import { Link } from "react-router-dom";

// AFTER: (remove the line entirely)
```

- [ ] **Step 5: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/features/pos/ReceiptView.tsx
git commit -m "fix(pos): make ReceiptView responsive, remove dead /servis link"
```
