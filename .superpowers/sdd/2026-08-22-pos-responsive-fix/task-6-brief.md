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
