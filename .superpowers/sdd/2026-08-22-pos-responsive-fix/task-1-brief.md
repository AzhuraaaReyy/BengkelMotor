### Task 1: Fix Modal Component Responsive Sizes

**Files:**
- Modify: `src/components/ui/Modal.tsx:13-17`

**Interfaces:**
- Consumes: None
- Produces: `Modal` component with responsive `size` prop

- [ ] **Step 1: Update Modal sizes to be responsive**

Change line 13-17 in `src/components/ui/Modal.tsx`:

```typescript
const sizes = {
  sm: "max-w-sm",
  md: "max-w-md lg:max-w-lg",
  lg: "max-w-2xl lg:max-w-4xl",
};
```

- [ ] **Step 2: Add max-height for scrollable content**

Change line 67 in `src/components/ui/Modal.tsx`:

```tsx
// BEFORE:
<div className="px-5 py-4">{children}</div>

// AFTER:
<div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Modal.tsx
git commit -m "fix(ui): make Modal responsive with larger sizes on lg+ screens"
```
