### Task 4: Fix Checkout Modal Size and CustomerSelector Responsive

**Files:**
- Modify: `src/features/pos/PosPage.tsx:634`
- Modify: `src/features/pos/CustomerSelector.tsx:85, 186`

**Interfaces:**
- Consumes: Modal from Task 1, CustomerSelector props
- Produces: Responsive checkout modal with form fields

- [ ] **Step 1: Change checkout modal size to lg**

Line 634 in `PosPage.tsx` -- change:
```
size="md"
```
to:
```
size="lg"
```

- [ ] **Step 2: Update CustomerSelector new customer form padding**

Line 85 in `CustomerSelector.tsx` -- change:
```
p-3 space-y-3
```
to:
```
p-3 md:p-4 space-y-3
```

- [ ] **Step 3: Update CustomerSelector existing customer service form padding**

Line 186 in `CustomerSelector.tsx` -- change:
```
p-3 space-y-3
```
to:
```
p-3 md:p-4 space-y-3
```

- [ ] **Step 4: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/pos/PosPage.tsx src/features/pos/CustomerSelector.tsx
git commit -m "fix(pos): make checkout modal lg size, responsive CustomerSelector padding"
```
