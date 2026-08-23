### Task 2: Fix PosPage Main Container and Grid Layout

**Files:**
- Modify: `src/features/pos/PosPage.tsx:270-277, 478-479`

**Interfaces:**
- Consumes: Modal component from Task 1
- Produces: Responsive POS page layout

- [ ] **Step 1: Fix negative margin mismatch on main container**

Line 270 -- change:
```
-m-6 p-6 pb-24 md:pb-6
```
to:
```
-m-4 p-4 pb-24 md:-m-6 md:p-6 md:pb-6
```

- [ ] **Step 2: Change grid breakpoint from md to lg**

Line 275 -- change:
```
grid grid-cols-1 md:grid-cols-12 gap-6
```
to:
```
grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6
```

- [ ] **Step 3: Update catalog column span**

Line 277 -- change:
```
md:col-span-7 lg:col-span-8
```
to:
```
lg:col-span-8
```

- [ ] **Step 4: Update cart column span**

Line 478 -- change:
```
md:col-span-5 lg:col-span-4
```
to:
```
lg:col-span-4
```

- [ ] **Step 5: Make cart panel height flexible**

Line 479 -- change:
```
p-5 ... min-h-[580px]
```
to:
```
p-4 lg:p-5 ... lg:min-h-[580px]
```

- [ ] **Step 6: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/features/pos/PosPage.tsx
git commit -m "fix(pos): make main POS layout responsive with lg breakpoint"
```
