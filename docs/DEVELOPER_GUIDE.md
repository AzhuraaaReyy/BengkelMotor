# 💻 Developer Guide - Payment System

Panduan teknis untuk developer yang akan maintain atau extend payment system.

---

## 📂 Struktur Kode

### Frontend (React/TypeScript)

```
frontend/src/
├── features/pos/
│   ├── PosPage.tsx              ← Main POS page dengan payment modal
│   ├── PaymentMethodSelector.tsx ← Selector CASH/QRIS/VA
│   ├── ReceiptView.tsx          ← Struk dengan auto-print
│   ├── WaitingPaymentModal.tsx  ← (Deprecated - reference only)
│   └── ...
├── lib/api/
│   ├── sales.ts                 ← API calls untuk sales
│   └── payments.ts              ← API calls untuk payment simulation
└── types/
    └── index.ts                 ← TypeScript types (Sale, PaymentMethod, etc)
```

### Backend (Laravel/PHP)

```
backend/
├── app/
│   ├── Http/Controllers/Api/
│   │   ├── SaleController.php           ← Checkout endpoint
│   │   └── PaymentWebhookController.php ← Webhook handler
│   ├── Services/
│   │   └── Payments/
│   │       ├── PaymentService.php       ← Main payment logic
│   │       ├── Contracts/
│   │       │   └── PaymentGateway.php   ← Interface
│   │       └── Gateways/
│   │           ├── MidtransGateway.php  ← Real gateway
│   │           └── FakePaymentGateway.php ← Simulasi
│   └── Models/
│       ├── Sale.php                     ← Model transaksi
│       └── PaymentCharge.php            ← Model payment charge
├── routes/
│   └── api.php                          ← API routes
└── config/
    └── services.php                     ← Midtrans config
```

---

## 🔑 Key Components

### 1. PosPage.tsx - Payment Modal

**State Management:**
```typescript
// State untuk monitoring payment
const [pendingSale, setPendingSale] = useState<Sale | null>(null);
const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "EXPIRED">("PENDING");
const [timeLeft, setTimeLeft] = useState(0);
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

**Countdown Timer Logic:**
```typescript
useEffect(() => {
  if (!pendingSale?.payment_expires_at || paymentStatus !== "PENDING") return;
  
  const expires = new Date(pendingSale.payment_expires_at).getTime();
  const tick = () => {
    const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
    setTimeLeft(remaining);
    if (remaining <= 0) {
      setPaymentStatus("EXPIRED");
      // Stop polling
    }
  };
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [pendingSale?.payment_expires_at, paymentStatus]);
```

**Polling Logic:**
```typescript
useEffect(() => {
  if (!pendingSale || paymentStatus !== "PENDING") return;
  
  const poll = async () => {
    try {
      const res = await getSaleApi(pendingSale.id);
      if (res.status === "PAID") {
        setPaymentStatus("PAID");
        setPendingSale(res);
        setShowSuccessModal(true);
      }
    } catch {
      // Silent fail
    }
  };

  pollingIntervalRef.current = setInterval(poll, 5000);
  return () => clearInterval(pollingIntervalRef.current);
}, [pendingSale, paymentStatus]);
```

**Cleanup Pattern:**
```typescript
// IMPORTANT: Always cleanup intervals
const handleClosePaymentModal = useCallback(() => {
  setCheckoutOpen(false);
  setPendingSale(null);
  setPaymentStatus("PENDING");
  setTimeLeft(0);
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
}, [setCheckoutOpen]);
```

### 2. ReceiptView.tsx - Auto Print

**Auto-print Logic:**
```typescript
const [searchParams] = useSearchParams();
const autoPrintTriggeredRef = useRef<boolean>(false);

useEffect(() => {
  const shouldAutoPrint = searchParams.get("autoprint") === "true";
  
  if (shouldAutoPrint && !autoPrintTriggeredRef.current) {
    autoPrintTriggeredRef.current = true;
    
    // Delay untuk ensure rendering selesai
    const timer = setTimeout(() => {
      handlePrint();
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [searchParams]);
```

### 3. PaymentService.php - Backend Logic

**Start Online Payment:**
```php
public function startOnlinePayment(Sale $sale, string $method): Sale
{
    return DB::transaction(function () use ($sale, $method) {
        // 1. Lock sale untuk prevent race condition
        $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
        
        // 2. Decrement stock
        $this->ledger->decrementForSale($sale, $productItems, $cashier->id);
        
        // 3. Create charge via gateway
        $charge = $this->gateway->createCharge(new PendingChargeRequest(...));
        
        // 4. Save payment charge
        PaymentCharge::create([...]);
        
        // 5. Update sale status
        $sale->status = Sale::STATUS_PENDING;
        $sale->save();
        
        return $sale;
    }, 5);
}
```

**Settle from Gateway (Webhook):**
```php
public function settleFromGateway(GatewayNotification $n): Sale
{
    return DB::transaction(function () use ($sale, $n) {
        // 1. Lock sale
        $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
        
        // 2. Validate amount
        if (bccomp($n->grossAmount, (string) $charge->amount, 2) !== 0) {
            throw new RuntimeException('Amount mismatch.', 422);
        }
        
        // 3. Update charge status
        $charge->status = PaymentCharge::STATUS_PAID;
        $charge->paid_at = now();
        $charge->save();
        
        // 4. Update sale status
        $sale->status = Sale::STATUS_PAID;
        $sale->paid_at = now();
        $sale->save();
        
        return $sale;
    }, 5);
}
```

### 4. AppServiceProvider.php - Gateway Binding

**Dynamic Gateway Selection:**
```php
public function register(): void
{
    $this->app->bind(PaymentGateway::class, function () {
        $serverKey = config('services.midtrans.server_key');
        
        // Jika ada server key → gunakan real gateway
        if ($serverKey) {
            return new MidtransGateway();
        }
        
        // Jika tidak ada → gunakan fake gateway
        return new FakePaymentGateway();
    });
}
```

---

## 🔄 Data Flow

### Checkout Flow (QRIS/VA)

```
1. Frontend: User klik "Proses Pembayaran"
   ↓
2. Frontend: POST /api/v1/sales/{id}/checkout
   {
     "payment_method": "QRIS",
     "discount_amount": 0,
     ...
   }
   ↓
3. Backend: SaleController@checkout
   - Validate request
   - Call CheckoutSaleService
   ↓
4. Backend: CheckoutSaleService@checkout
   - Check if online payment (QRIS/VA)
   - Call PaymentService@startOnlinePayment
   ↓
5. Backend: PaymentService@startOnlinePayment
   - Lock sale (prevent race condition)
   - Decrement stock
   - Create charge via gateway
   - Save PaymentCharge record
   - Update sale status → PENDING
   ↓
6. Backend: Gateway (Midtrans/Fake)
   - Generate QR Code / VA Number
   - Set expiry time (5 minutes)
   - Return GatewayCharge DTO
   ↓
7. Backend: Response to frontend
   {
     "data": {
       "id": 123,
       "status": "PENDING",
       "gateway_qr_string": "...",
       "gateway_va_number": "...",
       "payment_expires_at": "2026-09-03T15:00:00Z"
     }
   }
   ↓
8. Frontend: Set pendingSale state
   - Start countdown timer
   - Start polling (every 5 seconds)
   - Display QR/VA in modal
   ↓
9a. User pays → Midtrans webhook
    ↓
    Backend: PaymentWebhookController@handle
    - Verify signature
    - Parse notification
    - Call PaymentService@settleFromGateway
    - Update status → PAID
    ↓
9b. Frontend polling detects PAID
    ↓
    Show success modal
    ↓
10. User clicks "Cetak Struk"
    ↓
    Navigate to /pos/struk/{id}?autoprint=true
    ↓
    Auto-trigger window.print()
```

### Expiry Flow

```
1. Timer reaches 0:00 OR webhook sends "expire"
   ↓
2. Frontend: setPaymentStatus("EXPIRED")
   - Stop polling
   - Show "Kedaluwarsa" message
   ↓
3. Backend: PaymentService@expire (via webhook or manual)
   - Lock sale
   - Update charge status → EXPIRED
   - Increment stock (return stock)
   - Update sale status → EXPIRED
   ↓
4. User clicks "Coba Lagi"
   - Reset state
   - Can checkout again
```

---

## 🎨 UI States

### Modal Payment Details

| State | Condition | Display |
|-------|-----------|---------|
| **INITIAL** | `!pendingSale` | Preview placeholder + form input |
| **PENDING** | `pendingSale && status=PENDING` | Real QR/VA + countdown + polling |
| **PAID** | `paymentStatus=PAID` | (Modal closes, success modal shows) |
| **EXPIRED** | `paymentStatus=EXPIRED` | "Kedaluwarsa" message + Coba Lagi button |

### Footer Buttons

| State | Left Button | Right Button |
|-------|-------------|--------------|
| **INITIAL** | Batal | Proses Pembayaran |
| **PENDING** | Tutup (Pembayaran Tetap Berjalan) | - |
| **EXPIRED** | Tutup | Coba Lagi |

---

## 🔧 Extending the System

### Add New Payment Method

#### 1. Update Types (Frontend)

```typescript
// frontend/src/types/index.ts
export type PaymentMethod = "CASH" | "QRIS" | "VA" | "EWALLET"; // Add EWALLET
```

#### 2. Update Constants

```typescript
// frontend/src/lib/constants.ts
export const PAYMENT_METHODS = {
  CASH: "CASH",
  QRIS: "QRIS",
  VA: "VA",
  EWALLET: "EWALLET", // Add
} as const;

export const PAYMENT_LABEL = {
  CASH: "Tunai",
  QRIS: "QRIS",
  VA: "Virtual Account",
  EWALLET: "E-Wallet", // Add
};
```

#### 3. Update Backend Constants

```php
// backend/app/Models/Sale.php
public const PAYMENT_CASH = 'CASH';
public const PAYMENT_QRIS = 'QRIS';
public const PAYMENT_VA = 'VA';
public const PAYMENT_EWALLET = 'EWALLET'; // Add
public const ONLINE_METHODS = [
    self::PAYMENT_QRIS,
    self::PAYMENT_VA,
    self::PAYMENT_EWALLET, // Add
];
```

#### 4. Update Gateway

```php
// backend/app/Services/Payments/Gateways/MidtransGateway.php
$payload['payment_type'] = match ($request->method) {
    'QRIS' => 'qris',
    'VA' => 'bank_transfer',
    'EWALLET' => 'gopay', // Add
    default => throw new RuntimeException("Unsupported method"),
};
```

#### 5. Update Frontend UI

```typescript
// frontend/src/features/pos/PosPage.tsx
{pendingSale && pendingSale.payment_method === "EWALLET" && paymentStatus === "PENDING" && (
  <div>
    {/* Display deeplink atau QR untuk e-wallet */}
    <a href={pendingSale.gateway_deeplink} target="_blank">
      Buka GoPay
    </a>
  </div>
)}
```

### Add WebSocket (Replace Polling)

#### 1. Install Laravel WebSockets

```bash
composer require beyondcode/laravel-websockets
php artisan websockets:install
php artisan migrate
```

#### 2. Create Event

```php
// backend/app/Events/PaymentStatusChanged.php
class PaymentStatusChanged implements ShouldBroadcast
{
    public function __construct(public Sale $sale) {}
    
    public function broadcastOn()
    {
        return new Channel('sale.' . $this->sale->id);
    }
}
```

#### 3. Trigger in PaymentService

```php
// backend/app/Services/Payments/PaymentService.php
public function settleFromGateway(GatewayNotification $n): Sale
{
    // ... existing code ...
    
    // Broadcast event
    broadcast(new PaymentStatusChanged($sale));
    
    return $sale;
}
```

#### 4. Listen in Frontend

```typescript
// frontend/src/features/pos/PosPage.tsx
import Echo from 'laravel-echo';

useEffect(() => {
  if (!pendingSale) return;
  
  const echo = new Echo({...});
  
  echo.channel(`sale.${pendingSale.id}`)
    .listen('PaymentStatusChanged', (e: any) => {
      if (e.sale.status === 'PAID') {
        setPaymentStatus('PAID');
        setShowSuccessModal(true);
      }
    });
  
  return () => {
    echo.leaveChannel(`sale.${pendingSale.id}`);
  };
}, [pendingSale]);
```

---

## 🐛 Common Debugging Scenarios

### Issue: QR Code tidak muncul

**Debug Steps:**
```bash
# 1. Check API response
curl -X GET http://localhost:8000/api/v1/sales/123 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# 2. Check fields
# Harus ada salah satu:
# - gateway_qr_string (string EMVCo)
# - gateway_qr_url (URL image)

# 3. Check browser console
# F12 → Console → cari error rendering QR

# 4. Check gateway
# Pastikan gateway return data:
php artisan tinker
>>> $gateway = app(\App\Services\Payments\Contracts\PaymentGateway::class);
>>> $gateway instanceof \App\Services\Payments\Gateways\FakePaymentGateway
```

### Issue: Polling tidak work

**Debug Steps:**
```typescript
// 1. Add console log
useEffect(() => {
  if (!pendingSale || paymentStatus !== "PENDING") return;
  
  const poll = async () => {
    console.log('Polling sale:', pendingSale.id);
    try {
      const res = await getSaleApi(pendingSale.id);
      console.log('Polling result:', res.status);
      // ...
    } catch (e) {
      console.error('Polling error:', e);
    }
  };
  
  // ...
}, [pendingSale, paymentStatus]);

// 2. Check network tab
// F12 → Network → XHR
// Harus ada request setiap 5 detik

// 3. Check if interval is cleared
// Console → pollingIntervalRef.current
// Jika null → interval stopped
```

### Issue: Webhook tidak diterima

**Debug Steps:**
```bash
# 1. Check Laravel logs
tail -f backend/storage/logs/laravel.log

# 2. Test webhook manually
curl -X POST http://localhost:8000/api/v1/payments/webhook/midtrans \
  -H "Content-Type: application/json" \
  -H "X-Signature: test" \
  -d '{
    "order_id": "SALE-001",
    "transaction_status": "settlement",
    "gross_amount": "100000",
    "transaction_id": "TX-123",
    "status_code": "200"
  }'

# 3. Check Midtrans Dashboard
# Transactions → pilih transaksi → View Details
# Cek "Notification History"

# 4. Check webhook URL di Midtrans
# Settings → Configuration → Notification URL
# Pastikan URL correct dan accessible
```

---

## 📊 Performance Optimization

### Current Bottlenecks

1. **Polling setiap 5 detik**
   - Solution: Implement WebSocket

2. **QR Code rendering**
   - Solution: Lazy load QRCode component

3. **Multiple re-renders**
   - Solution: Use React.memo untuk child components

### Optimization Tips

```typescript
// 1. Memoize expensive computations
const qrCodeValue = useMemo(() => {
  return pendingSale?.gateway_qr_string;
}, [pendingSale?.gateway_qr_string]);

// 2. Debounce state updates
const [debouncedTimeLeft] = useDebounce(timeLeft, 100);

// 3. Lazy load QRCode
const QRCode = lazy(() => import('react-qr-code'));

// 4. Use React.memo for child components
const PaymentQRDisplay = React.memo(({ qrString }: { qrString: string }) => {
  return <QRCode value={qrString} />;
});
```

---

## 🔒 Security Best Practices

### 1. Webhook Signature Verification

```php
// ALWAYS verify signature
public function handle(Request $request): JsonResponse
{
    $signature = (string) $request->header('X-Signature', '');
    
    if (!$this->gateway->verifySignature($payload, $signature)) {
        return response()->json(['message' => 'Invalid signature.'], 400);
    }
    
    // Process webhook...
}
```

### 2. Amount Validation

```php
// ALWAYS validate amount
if (bccomp($n->grossAmount, (string) $charge->amount, 2) !== 0) {
    throw new RuntimeException('Amount mismatch.', 422);
}
```

### 3. Transaction Locking

```php
// ALWAYS use lock for critical operations
return DB::transaction(function () use ($sale) {
    $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
    // ... update sale ...
}, 5); // Max 5 retries
```

### 4. Input Sanitization

```php
// ALWAYS validate and sanitize
$validated = $request->validate([
    'payment_method' => ['required', 'in:CASH,QRIS,VA'],
    'paid_amount' => ['nullable', 'numeric', 'min:0'],
    // ...
]);
```

---

## 📝 Code Style Guidelines

### Frontend (TypeScript)

```typescript
// ✅ GOOD: Descriptive names
const handleSimulatePayment = useCallback(async () => {
  // ...
}, [pendingSale, simulating, toast]);

// ❌ BAD: Ambiguous names
const doIt = () => { /* ... */ };

// ✅ GOOD: Use TypeScript types
const [pendingSale, setPendingSale] = useState<Sale | null>(null);

// ❌ BAD: Use any
const [data, setData] = useState<any>(null);

// ✅ GOOD: Cleanup effects
useEffect(() => {
  const interval = setInterval(poll, 5000);
  return () => clearInterval(interval);
}, []);

// ❌ BAD: No cleanup
useEffect(() => {
  setInterval(poll, 5000);
}, []);
```

### Backend (PHP)

```php
// ✅ GOOD: Type hints
public function settle(GatewayNotification $n): Sale
{
    // ...
}

// ❌ BAD: No type hints
public function settle($notification)
{
    // ...
}

// ✅ GOOD: Use transactions
return DB::transaction(function () use ($sale) {
    // ...
}, 5);

// ❌ BAD: No transaction
$sale->update(['status' => 'PAID']);

// ✅ GOOD: Explicit error handling
if ($sale->status !== Sale::STATUS_PENDING) {
    throw new RuntimeException('Only PENDING sales can be settled.', 409);
}

// ❌ BAD: Silent failures
if ($sale->status !== 'PENDING') {
    return null;
}
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] PaymentService::startOnlinePayment
- [ ] PaymentService::settleFromGateway
- [ ] PaymentService::expire
- [ ] MidtransGateway::createCharge
- [ ] FakePaymentGateway::createCharge
- [ ] PaymentWebhookController::handle

### Integration Tests

- [ ] Checkout flow CASH
- [ ] Checkout flow QRIS (simulasi)
- [ ] Checkout flow VA (simulasi)
- [ ] Webhook handling
- [ ] Expiry handling

### E2E Tests

- [ ] Full payment flow (user perspective)
- [ ] Auto-print trigger
- [ ] Copy VA feature
- [ ] Countdown timer
- [ ] Polling mechanism

---

## 📚 Additional Resources

- **Midtrans API Docs:** https://docs.midtrans.com/
- **Laravel Transactions:** https://laravel.com/docs/database#database-transactions
- **React Hooks Guide:** https://react.dev/reference/react
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

---

**Last Updated:** 2026-09-03 14:48:14 UTC  
**Maintained by:** Development Team
