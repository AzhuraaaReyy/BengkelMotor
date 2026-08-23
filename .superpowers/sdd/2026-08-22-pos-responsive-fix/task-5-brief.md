### Task 5: Fix PaymentMethodSelector Responsive

**Files:**
- Modify: `src/features/pos/PaymentMethodSelector.tsx:25, 34`

**Interfaces:**
- Consumes: None
- Produces: Responsive payment method grid

- [ ] **Step 1: Update grid to 4 columns on larger screens**

Line 25 -- change:
```
grid grid-cols-2 gap-2
```
to:
```
grid grid-cols-2 lg:grid-cols-4 gap-2
```

- [ ] **Step 2: Update button padding for mobile**

Line 34 -- change:
```
p-3 text-center
```
to:
```
p-2.5 md:p-3 text-center
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/features/pos/PaymentMethodSelector.tsx
git commit -m "fix(pos): make PaymentMethodSelector 4-col on lg screens"
```
