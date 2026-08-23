### Task 3: Fix Product and Service Grid Responsive

**Files:**
- Modify: `src/features/pos/PosPage.tsx:360, 433`

**Interfaces:**
- Consumes: Layout from Task 2
- Produces: Responsive product/service card grids

- [ ] **Step 1: Update product grid columns**

Line 360 -- change:
```
grid grid-cols-2 sm:grid-cols-3 gap-3
```
to:
```
grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3
```

- [ ] **Step 2: Update service grid columns**

Line 433 -- change:
```
grid grid-cols-2 sm:grid-cols-3 gap-3
```
to:
```
grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/features/pos/PosPage.tsx
git commit -m "fix(pos): add xl breakpoint for 4-col product grid on large desktop"
```
