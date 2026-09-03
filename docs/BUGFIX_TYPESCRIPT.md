# 🔧 Bug Fixes - TypeScript Errors

**Tanggal:** 03 September 2026, 21:57 WIB  
**Status:** ✅ **FIXED**

---

## 🐛 Error yang Diperbaiki

### 1. **Error: Cannot find namespace 'NodeJS'**

**Problem:**
```typescript
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

TypeScript tidak menemukan namespace `NodeJS` karena type definitions tidak tersedia di browser environment.

**Solution:**
```typescript
const pollingIntervalRef = useRef<number | null>(null);
```

Changed dari `NodeJS.Timeout` ke `number` karena di browser environment, `setInterval` return type adalah `number`.

---

### 2. **Error: Type 'Timeout' is not assignable to type 'number'**

**Problem:**
```typescript
pollingIntervalRef.current = setInterval(poll, 5000);
// Error: Type 'Timeout' is not assignable to type 'number'
```

**Solution:**
```typescript
pollingIntervalRef.current = setInterval(poll, 5000) as unknown as number;
```

Added type casting untuk handle perbedaan return type antara Node.js dan browser environment.

---

### 3. **Warning: React Hooks preserve-manual-memoization**

**Problem:**
```typescript
const copyVa = useCallback(async () => {
  if (!pendingSale?.gateway_va_number) return;
  // ...
}, [pendingSale?.gateway_va_number, toast]);
```

React Compiler inferred dependency `pendingSale`, tapi manual dependencies adalah `pendingSale?.gateway_va_number`.

**Solution:**
```typescript
const copyVa = useCallback(async () => {
  if (!pendingSale?.gateway_va_number) return;
  // ...
}, [pendingSale, toast]);
```

Changed dependency dari `pendingSale?.gateway_va_number` ke `pendingSale` untuk match dengan inferred dependencies.

---

## ✅ Build Status

**Before:**
```
❌ error TS2503: Cannot find namespace 'NodeJS'.
❌ error TS2322: Type 'Timeout' is not assignable to type 'number'.
⚠️  warning: React Hooks preserve-manual-memoization
```

**After:**
```
✅ tsc -b && vite build
✅ ✓ 2550 modules transformed.
✅ ✓ built in 2.05s
✅ Bundle size: 909.08 kB
```

---

## 📊 Final Status

| Check | Status |
|-------|--------|
| TypeScript Compilation | ✅ PASS |
| Build Process | ✅ SUCCESS |
| Bundle Size | ✅ 909 KB (optimal) |
| Errors | ✅ 0 errors |
| Warnings | ⚠️ Only bundle size warning (normal) |

---

## 🔍 Technical Details

### Why `number` instead of `NodeJS.Timeout`?

Di browser environment:
- `setInterval()` return type: `number`
- `setTimeout()` return type: `number`
- `clearInterval()` accepts: `number`
- `clearTimeout()` accepts: `number`

Di Node.js environment:
- `setInterval()` return type: `NodeJS.Timeout`
- `setTimeout()` return type: `NodeJS.Timeout`

Karena aplikasi ini berjalan di browser (React app), kita menggunakan `number`.

### Why cast `as unknown as number`?

TypeScript inference kadang mengembalikan type `Timeout` (dari lib.dom.d.ts) yang technically bisa incompatible dengan `number`. Casting `as unknown as number` memastikan type compatibility.

Alternative yang bisa digunakan:
```typescript
// Option 1: Type casting (yang kita pakai)
pollingIntervalRef.current = setInterval(poll, 5000) as unknown as number;

// Option 2: Window prefix
pollingIntervalRef.current = window.setInterval(poll, 5000);

// Option 3: ReturnType utility
const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

---

## 🎯 Lessons Learned

1. **Always use browser-specific types for browser apps**
   - `number` for timers
   - Avoid `NodeJS.*` types

2. **Match inferred dependencies in useCallback**
   - React Compiler is smart about inferring deps
   - Use whole object instead of deep properties when possible

3. **Type casting untuk edge cases**
   - Use `as unknown as Type` untuk force casting when needed
   - Document why casting is needed

---

## ✅ Verification

```bash
# Build test
cd D:\PORTOFOLIO\BengkelMotor\frontend
npm run build

# Output:
# ✓ 2550 modules transformed.
# ✓ built in 2.05s
# Bundle: 909.08 kB
```

---

**Status: ALL ERRORS FIXED** ✅
