# POS Page Responsive Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire POS page flow (catalog, cart, checkout modal, customer selector, payment waiting, receipt) fully responsive across mobile, tablet portrait, tablet landscape, and desktop viewports.

**Architecture:** Fix responsive issues across 6 component files. Use proper Tailwind breakpoints (`md:` = 768px, `lg:` = 1024px, `xl:` = 1280px) with responsive padding, grid columns, and modal sizes. No new components needed -- only class name adjustments.

**Tech Stack:** React + TypeScript + Tailwind CSS

**Spec:** N/A (responsive fix based on visual inspection of existing code)

## Global Constraints

- UI text in Bahasa Indonesia
- Code identifiers in English
- Must work on: Mobile (< 768px), Tablet Portrait (768-1023px), Tablet Landscape (1024-1279px), Desktop (>= 1280px)
- Existing design tokens in `src/index.css` must be preserved
- No new dependencies allowed

## Breakpoint Strategy

| Breakpoint | Width | POS Behavior |
|------------|-------|--------------|
| Mobile | < 768px | Stacked layout, 2-col product grid, sticky cart bar |
| Tablet Portrait | 768px - 1023px | Stacked layout, 3-col product grid, no sticky cart bar |
| Tablet Landscape | 1024px - 1279px | Side-by-side layout, 3-col product grid, wider modals |
| Desktop | >= 1280px | Side-by-side layout, 4-col product grid, full modals |

## File Map

| File | Responsibility |
|------|----------------|
| `src/features/pos/PosPage.tsx` | Main POS layout, catalog grid, cart panel, checkout modal trigger |
| `src/components/ui/Modal.tsx` | Reusable modal with responsive sizes |
| `src/features/pos/CustomerSelector.tsx` | Customer dropdown + new customer form + service data form |
| `src/features/pos/PaymentMethodSelector.tsx` | Payment method grid (CASH, QRIS, VA, GOPAY) |
| `src/features/pos/WaitingPaymentModal.tsx` | QR/VA/GoPay waiting payment display |
| `src/features/pos/ReceiptView.tsx` | Receipt display after successful payment |

---

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

---

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

---

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

---

### Task 4: Fix Checkout Modal Size and CustomerSelector Responsive

**Files:**
- Modify: `src/features/pos/PosPage.tsx:634`
- Modify: `src/features/pos/CustomerSelector.tsx:85, 108-134, 136, 186`

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

- [ ] **Step 3: Update CustomerSelector textarea rows for mobile**

Lines 114-120 in `CustomerSelector.tsx` -- change complaint textarea rows:
```
rows={3}
```
to:
```
rows={2} md:rows={3}
```

(Note: Tailwind does not support `md:rows-3` on textarea. Instead, keep `rows={2}` as default and use CSS min-height approach or keep rows={3} since it works fine on all screens.)

Actually, keep `rows={3}` as-is -- textarea is already responsive with `w-full`.

- [ ] **Step 4: Update CustomerSelector existing customer service form padding**

Line 186 in `CustomerSelector.tsx` -- change:
```
p-3 space-y-3
```
to:
```
p-3 md:p-4 space-y-3
```

- [ ] **Step 5: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/features/pos/PosPage.tsx src/features/pos/CustomerSelector.tsx
git commit -m "fix(pos): make checkout modal lg size, responsive CustomerSelector padding"
```

---

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

---

### Task 6: Fix WaitingPaymentModal Responsive

**Files:**
- Modify: `src/features/pos/WaitingPaymentModal.tsx:69, 88-93, 103`

**Interfaces:**
- Consumes: Modal from Task 1
- Produces: Responsive waiting payment display

- [ ] **Step 1: Make total amount text responsive**

Line 69 -- change:
```
text-center text-3xl font-bold
```
to:
```
text-center text-2xl md:text-3xl font-bold
```

- [ ] **Step 2: Make QR code responsive**

Line 90 -- change:
```
<QRCode value={sale.gateway_qr_string} size={200} />
```
to:
```
<QRCode value={sale.gateway_qr_string} size={180} className="w-[140px] h-[140px] md:w-[180px] md:h-[180px]" />
```

Also update the img fallback on line 92:
```
className="h-[200px] w-[200px] object-contain"
```
to:
```
className="h-[140px] w-[140px] md:h-[180px] md:w-[180px] object-contain"
```

- [ ] **Step 3: Make VA number responsive**

Line 103 -- change:
```
text-2xl font-mono font-bold
```
to:
```
text-xl md:text-2xl font-mono font-bold break-all
```

- [ ] **Step 4: Verify build passes**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/pos/WaitingPaymentModal.tsx
git commit -m "fix(pos): make WaitingPaymentModal responsive with responsive QR and text"
```

---

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

---

### Task 8: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full build verification**

Run: `cd D:\PORTOFOLIO\BengkelMotor\frontend; npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Visual testing checklist**

Test on these viewports:
- Mobile (375px): stacked layout, 2-col product grid, sticky cart bar visible
- Tablet Portrait (768px): stacked layout, 3-col product grid, no sticky cart bar
- Tablet Landscape (1024px): side-by-side layout, 3-col product grid, wider modals
- Desktop (1280px): side-by-side layout, 4-col product grid, full modals

Check these flows:
1. POS page main layout -- catalog + cart stacked/side-by-side correctly
2. Product/service grids -- correct column count per viewport
3. Checkout modal -- opens wider on lg+ screens
4. CustomerSelector form -- padding responsive, textarea not overflowing
5. PaymentMethodSelector -- 4 columns on lg+
6. WaitingPaymentModal -- QR code responsive, text not overflowing
7. ReceiptView -- buttons horizontal on tablet, no dead link

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(pos): final responsive adjustments"
```
