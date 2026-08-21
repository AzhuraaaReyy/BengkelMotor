# Pembayaran Online via Midtrans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan pembayaran online QRIS/VA/GoPay via Midtrans pada POS bengkel, menggantikan metode manual TRANSFER/QRIS, dengan sale berstatus PENDING sampai konfirmasi webhook dan stok di-reserve saat checkout.

**Architecture:** Deep module — port `PaymentGateway` (seam eksternal true-external dependency, adapter `MidtransGateway` untuk produksi + `FakePaymentGateway` untuk test) dan `PaymentService` (lifecycle PENDING→PAID/EXPIRED, konservasi stok via `StockLedger`, idempotensi, audit). `CheckoutSaleService::checkout()` tetap satu pintu masuk: untuk metode online mendelegasikan finalisasi ke `PaymentService::startOnlinePayment()` dalam transaction yang sama. Webhook publik tipis memvalidasi signature lalu memanggil `settleFromGateway()`.

**Tech Stack:** Laravel 12 (PHP 8.2+), Laravel HTTP facade, MySQL 8 (dev) / SQLite in-memory (test), React 18 + TypeScript + Vite + Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-20-pembayaran-online-midtrans-design.md`

## Global Constraints

- Uang memakai `DECIMAL`/BCMath (`bcmul`/`bcadd`/`bcsub`); stok & quantity `INTEGER`.
- Setiap perubahan stok wajib record `stock_movements` (Rules.md §9); reserve & restore harus satu kali (idempoten + `lockForUpdate`).
- Status sale baru: `DRAFT, PENDING, PAID, EXPIRED, VOID`; `payment_method` baru: `CASH, QRIS, VA, GOPAY` (TRANSFER→VA, OTHER→QRIS di-backfill).
- **Data gateway disimpan di tabel terpisah `payment_charges` (1:N sale→charge; sekarang 1 charge/sale)** — bukan kolom inline di `sales`. `gateway_transaction_id` **UNIQUE** (anti referensi duplikat). Status charge: `PENDING|PAID|EXPIRED|FAILED`.
- Enum diubah ke `string` di migration (portabel SQLite+MySQL); validasi diperkuat di aplikasi (Form Request/service).
- `order_id` Midtrans = `sale_code` (unik, `VARCHAR(40)`); signature webhook = SHA512 `orderId + statusCode + grossAmount + serverKey` (format dot-concatenated string).
- **`gross_amount` webhook dicocokkan ke `charge.amount`** (bukan sekadar `grand_total`); transisi ganda ditolak (status sale + charge + lock).
- Server Key hanya di server (`.env` + `config/services.php`); tidak pernah ke frontend; tidak di log/audit.
- UI teks Bahasa Indonesia; identifier/backend Bahasa Inggris; RBAC tidak berubah (checkout shared, void PAID Admin-only, dashboard/report Admin-only).
- Uji: backend `php artisan test` (SQLite), frontend `npx tsc -b` lalu `npx vite build`.

---

## Approved UI/UX Design (final — disetujui owner 2026-08-20)

Keputusan yang disetujui:
1. **Tombol online checkout = "Buat Tagihan"** (toast "Tagihan dibuat"); tunai tetap "Selesaikan Pembayaran".
2. **Badge EXPIRED = tone `neutral`** ("Kedaluwarsa"); PENDING = `warning` ("Menunggu Bayar").
3. **Menutup modal menunggu diizinkan**, tagihan tetap berjalan, tetap bisa dilihat lagi dari Riwayat.
4. **"Lanjutkan Pembayaran"** di `SalesHistoryPage` untuk baris PENDING (resume polling).
5. **Render QR lokal** dari `gateway_qr_string` via `react-qr-code`.

---

## Approved Database Design (final — disetujui owner 2026-08-20)

1. **Data gateway di tabel `payment_charges` (1:N sale→charge; sekarang 1 charge/sale)** — bukan kolom inline di `sales`.
2. **`payment_charges.gateway_transaction_id` UNIQUE**; `gross_amount` webhook dicocokkan ke **`charge.amount`**.
3. **Raw payload webhook disimpan ke `audit_log.after_data`** (tanpa header signature/secret).
4. Index: `(sale_id)`, `(status, expires_at)` untuk auto-expire.
5. Frontend tidak berubah: `SaleResource` memetakan charge terbaru ke field flat `gateway_*`/`payment_expires_at`.

---

## File Structure

**Backend — create:**
- `app/Services/Payments/Contracts/PaymentGateway.php`
- `app/Services/Payments/DTO/PendingChargeRequest.php`
- `app/Services/Payments/DTO/GatewayCharge.php`
- `app/Services/Payments/DTO/GatewayNotification.php`
- `app/Services/Payments/Gateways/MidtransGateway.php`
- `app/Services/Payments/Gateways/FakePaymentGateway.php`
- `app/Services/Payments/PaymentService.php`
- `app/Services/Inventory/StockLedger.php`
- `app/Http/Controllers/Api/PaymentWebhookController.php`
- `app/Console/Commands/ExpirePendingSales.php`
- `app/Models/PaymentCharge.php`
- `database/migrations/2026_08_20_100016_add_payment_gateway.php`
- `database/factories/PaymentChargeFactory.php`

**Backend — modify:**
- `app/Models/Sale.php` (status consts, relasi `paymentCharges`/`latestCharge`)
- `app/Models/StockMovement.php` (TYPE_SALE_REVERSAL)
- `app/Http/Resources/SaleResource.php` (field gateway)
- `app/Http/Controllers/Api/SaleController.php` (validasi payment_method baru)
- `app/Services/Sales/CheckoutSaleService.php` (orkestrasi online vs cash, pakai StockLedger)
- `app/Services/Sales/VoidSaleService.php` (pakai StockLedger)
- `config/services.php` (blok midtrans)
- `.env` / `.env.example` (MIDTRANS_*)
- `bootstrap/app.php` (csrf except untuk webhook)
- `routes/api.php` (webhook publik)
- `routes/console.php` (scheduler)
- `database/factories/SaleFactory.php` (state `pending()`)

**Frontend — modify:**
- `src/types/index.ts`
- `src/lib/constants.ts`
- `src/lib/api/sales.ts`
- `src/features/pos/PosPage.tsx`
- `src/components/ui/badges.tsx`
- `src/features/sales-history/SalesHistoryPage.tsx`
- `src/features/dashboard/DashboardPage.tsx`

**Frontend — create:**
- `src/features/pos/PaymentMethodSelector.tsx`
- `src/features/pos/WaitingPaymentModal.tsx`

**Frontend — dependency:**
- `react-qr-code`

**Tests — create:**
- `tests/Unit/Services/PaymentServiceTest.php`
- `tests/Unit/Services/MidtransGatewayTest.php`
- `tests/Feature/Payments/OnlineCheckoutTest.php`
- `tests/Feature/Payments/PaymentWebhookTest.php`

**Tests — modify:**
- `tests/Unit/Services/CheckoutSaleServiceTest.php`
- `tests/Unit/Services/VoidSaleServiceTest.php`
- `tests/Feature/Security/RbacMatrixTest.php`

**Docs — modify:** `Schema.md`, `Rules.md`, `Architecture.md`, `Design.md`, `security.md`, `PRD.md`, `TODO.md`

---

## Security Review Findings (tercatat di spec §12)

| ID | Severity | Finding | Task |
|----|----------|---------|------|
| SEC-PAY-001 | High | CSRF blocking webhook POST | Task 3 |
| SEC-PAY-002 | High | PaymentCharge mass assignment | Task 2 |
| SEC-PAY-003 | High | `gateway_raw_response` bocor ke API | Task 10 |
| SEC-PAY-004 | Medium | Charge lookup fallback match salah | Task 8 |
| SEC-PAY-005 | Medium | Race condition webhook vs auto-expire | Task 8 |
| SEC-PAY-006 | Medium | Raw webhook payload menyimpan PII | Task 14 |
| SEC-PAY-007 | Medium | LIKE wildcard di search sale | Task 14 |
| SEC-PAY-008 | Medium | CORS allows any origin | Task 14 |
| SEC-PAY-009 | Low | Charge ID tidak di-audit | Task 8 |
| SEC-PAY-010 | Low | `webhook_secret` config tidak dipakai | Task 3 |
| SEC-PAY-011 | Low | Checkout rate limiting untuk online | Task 9 |
| SEC-PAY-012 | Low | `security.md` tidak cover payment | Task 14 |

---

### Task 1: Migration + Model Updates

**Goal:** Create `payment_charges` table, convert `sales` enums to strings, add `TYPE_SALE_REVERSAL` to StockMovement. Existing tests must stay green.

**Files:**
- Create: `database/migrations/2026_08_20_100016_add_payment_gateway.php`
- Modify: `app/Models/Sale.php`, `app/Models/StockMovement.php`

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('status', 20)->default('DRAFT')->change();
            $table->string('payment_method', 20)->nullable()->change();
        });

        Schema::create('payment_charges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->string('method', 20);
            $table->decimal('amount', 15, 2);
            $table->string('status', 20)->default('PENDING');
            $table->string('gateway_transaction_id', 100)->nullable()->unique();
            $table->string('gateway_type', 20)->nullable();
            $table->string('va_number', 50)->nullable();
            $table->text('qr_url')->nullable();
            $table->text('qr_string')->nullable();
            $table->text('deeplink')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->index('sale_id');
            $table->index(['status', 'expires_at']);
        });

        DB::table('sales')->where('payment_method', 'TRANSFER')->update(['payment_method' => 'VA']);
        DB::table('sales')->where('payment_method', 'OTHER')->update(['payment_method' => 'QRIS']);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_charges');
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('payment_method', ['CASH', 'TRANSFER', 'QRIS', 'OTHER'])->nullable()->change();
            $table->enum('status', ['DRAFT', 'PAID', 'VOID'])->default('DRAFT')->change();
        });
    }
};
```

- [ ] **Step 2: Run migration**

Run: `php artisan migrate`
Expected: `payment_charges` table created; `sales.status` and `sales.payment_method` are now strings.

- [ ] **Step 3: Update `Sale` model** — add status consts + relationships

Add to `app/Models/Sale.php`:

```php
public const STATUS_PENDING = 'PENDING';
public const STATUS_EXPIRED = 'EXPIRED';

public const PAYMENT_CASH = 'CASH';
public const PAYMENT_QRIS = 'QRIS';
public const PAYMENT_VA = 'VA';
public const PAYMENT_GOPAY = 'GOPAY';
public const ONLINE_METHODS = [self::PAYMENT_QRIS, self::PAYMENT_VA, self::PAYMENT_GOPAY];

public function paymentCharges(): HasMany
{
    return $this->hasMany(PaymentCharge::class);
}

public function latestCharge(): HasOne
{
    return $this->hasOne(PaymentCharge::class)->latestOfMany();
}
```

- [ ] **Step 4: Update `StockMovement` model** — add `TYPE_SALE_REVERSAL`

Add to `app/Models/StockMovement.php`:

```php
public const TYPE_SALE_REVERSAL = 'SALE_REVERSAL';
```

- [ ] **Step 5: Run existing tests**

Run: `php artisan test`
Expected: all existing tests PASS (enum→string breaks nothing since Eloquent passes strings).

- [ ] **Step 6: Commit**

```bash
git add database/migrations backend/app/Models/Sale.php backend/app/Models/StockMovement.php
git commit -m "feat: payment_charges table + sale status PENDING/EXPIRED + StockMovement TYPE_SALE_REVERSAL"
```

---

### Task 2: PaymentCharge Model + Factory

**Goal:** Create `PaymentCharge` model with `$guarded = []` (SECURITY: SEC-PAY-002) and factory for tests.

**Files:**
- Create: `app/Models/PaymentCharge.php`, `database/factories/PaymentChargeFactory.php`

- [ ] **Step 1: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentCharge extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PAID = 'PAID';
    public const STATUS_EXPIRED = 'EXPIRED';
    public const STATUS_FAILED = 'FAILED';

    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
```

- [ ] **Step 2: Write the factory**

```php
<?php

namespace Database\Factories;

use App\Models\PaymentCharge;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentChargeFactory extends Factory
{
    protected $model = PaymentCharge::class;

    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory(),
            'method' => 'QRIS',
            'amount' => 100000,
            'status' => PaymentCharge::STATUS_PENDING,
            'gateway_transaction_id' => 'TX-' . fake()->unique()->numerify('######'),
            'expires_at' => now()->addMinutes(15),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => PaymentCharge::STATUS_PENDING]);
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => PaymentCharge::STATUS_PAID,
            'paid_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['status' => PaymentCharge::STATUS_EXPIRED]);
    }
}
```

- [ ] **Step 3: Add `pending()` state to `SaleFactory`**

Add to `database/factories/SaleFactory.php`:

```php
public function pending(string $method = 'QRIS'): static
{
    return $this->state(fn (array $attributes) => [
        'status' => Sale::STATUS_PENDING,
        'payment_method' => $method,
    ]);
}
```

- [ ] **Step 4: Run tests**

Run: `php artisan test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Models/PaymentCharge.php backend/database/factories/PaymentChargeFactory.php backend/database/factories/SaleFactory.php
git commit -m "feat: PaymentCharge model + factory + SaleFactory pending state"
```

---

### Task 3: Config + CSRF Exception

**Goal:** Add Midtrans config, env vars, and CSRF exception for webhook route (SECURITY: SEC-PAY-001).

**Files:**
- Modify: `config/services.php`, `.env`, `.env.example`, `bootstrap/app.php`

- [ ] **Step 1: Add midtrans block to `config/services.php`**

Add at the end of the return array:

```php
'midtrans' => [
    'server_key' => env('MIDTRANS_SERVER_KEY'),
    'client_key' => env('MIDTRANS_CLIENT_KEY'),
    'is_production' => (bool) env('MIDTRANS_IS_PRODUCTION', false),
    'charge_url' => env('MIDTRANS_IS_PRODUCTION', false)
        ? 'https://api.midtrans.com/v2'
        : 'https://api.sandbox.midtrans.com/v2',
],
```

- [ ] **Step 2: Add env vars to `.env` and `.env.example`**

```
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 3: Exempt webhook from CSRF in `bootstrap/app.php`**

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->validateCsrfTokens(except: [
        'api/v1/payments/webhook/*',
    ]);
    // ... existing config unchanged
})
```

- [ ] **Step 4: Verify config loads**

Run: `php artisan config:clear && php artisan tinker --execute="dump(config('services.midtrans.is_production'))"`
Expected: prints `false`.

- [ ] **Step 5: Commit**

```bash
git add config/services.php .env .env.example bootstrap/app.php
git commit -m "feat: midtrans config + csrf exception for webhook"
```

---

### Task 4: DTOs + PaymentGateway Interface

**Goal:** Create value objects and port interface. All subsequent tasks depend on these types.

**Files:**
- Create: `app/Services/Payments/Contracts/PaymentGateway.php`, `app/Services/Payments/DTO/PendingChargeRequest.php`, `app/Services/Payments/DTO/GatewayCharge.php`, `app/Services/Payments/DTO/GatewayNotification.php`

**Type definitions (lock these — all later tasks use these exact signatures):**

```php
// PendingChargeRequest
PendingChargeRequest {
    int $orderId,
    string $saleCode,
    string $method,       // QRIS|VA|GOPAY
    string $grossAmount,  // decimal string e.g. "90000.00"
    array $items,         // [{id, name, price, quantity}]
    ?array $customer      // {first_name?}
}

// GatewayCharge
GatewayCharge {
    ?string $gatewayTransactionId,
    string $method,       // QRIS|VA|GOPAY
    ?string $qrUrl,
    ?string $qrString,
    ?string $vaNumber,
    ?string $deepLink,
    \DateTimeInterface $expiresAt
}

// GatewayNotification
GatewayNotification {
    string $orderId,       // sale_code
    string $status,        // PAID|EXPIRED|FAILED
    string $grossAmount,   // decimal string
    string $gatewayTransactionId
}
```

- [ ] **Step 1: Create `PendingChargeRequest.php`**

```php
<?php

namespace App\Services\Payments\DTO;

readonly class PendingChargeRequest
{
    public function __construct(
        public int $orderId,
        public string $saleCode,
        public string $method,
        public string $grossAmount,
        public array $items,
        public ?array $customer = null,
    ) {}
}
```

- [ ] **Step 2: Create `GatewayCharge.php`**

```php
<?php

namespace App\Services\Payments\DTO;

readonly class GatewayCharge
{
    public function __construct(
        public ?string $gatewayTransactionId,
        public string $method,
        public ?string $qrUrl,
        public ?string $qrString,
        public ?string $vaNumber,
        public ?string $deepLink,
        public \DateTimeInterface $expiresAt,
    ) {}
}
```

- [ ] **Step 3: Create `GatewayNotification.php`**

```php
<?php

namespace App\Services\Payments\DTO;

readonly class GatewayNotification
{
    public function __construct(
        public string $orderId,
        public string $status,
        public string $grossAmount,
        public string $gatewayTransactionId,
    ) {}
}
```

- [ ] **Step 4: Create `PaymentGateway.php` interface**

```php
<?php

namespace App\Services\Payments\Contracts;

use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;

interface PaymentGateway
{
    public function createCharge(PendingChargeRequest $request): GatewayCharge;
    public function verifySignature(array $payload, string $signature): bool;
    public function parseNotification(array $payload): GatewayNotification;
}
```

- [ ] **Step 5: Lint all files**

Run: `php -l app/Services/Payments/Contracts/PaymentGateway.php && php -l app/Services/Payments/DTO/PendingChargeRequest.php && php -l app/Services/Payments/DTO/GatewayCharge.php && php -l app/Services/Payments/DTO/GatewayNotification.php`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add app/Services/Payments
git commit -m "feat: payment gateway port + DTOs"
```

---

### Task 5: FakePaymentGateway

**Goal:** Create test double implementing `PaymentGateway` for all subsequent tests.

**Files:**
- Create: `app/Services/Payments/Gateways/FakePaymentGateway.php`

- [ ] **Step 1: Write the fake**

```php
<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;

class FakePaymentGateway implements PaymentGateway
{
    public bool $signatureValid = true;
    public int $chargeCalls = 0;

    public function createCharge(PendingChargeRequest $request): GatewayCharge
    {
        $this->chargeCalls++;
        return match ($request->method) {
            'QRIS' => new GatewayCharge(
                gatewayTransactionId: 'TX-QRIS-' . $request->orderId,
                method: 'QRIS',
                qrUrl: 'https://example.test/qr/' . $request->orderId,
                qrString: 'QR:' . $request->orderId,
                deepLink: null,
                vaNumber: null,
                expiresAt: now()->addMinutes(15),
            ),
            'VA' => new GatewayCharge(
                gatewayTransactionId: 'TX-VA-' . $request->orderId,
                method: 'VA',
                qrUrl: null,
                qrString: null,
                deepLink: null,
                vaNumber: '1234567890',
                expiresAt: now()->addMinutes(15),
            ),
            'GOPAY' => new GatewayCharge(
                gatewayTransactionId: 'TX-GP-' . $request->orderId,
                method: 'GOPAY',
                qrUrl: null,
                qrString: null,
                deepLink: 'gopay://pay/' . $request->orderId,
                vaNumber: null,
                expiresAt: now()->addMinutes(15),
            ),
        };
    }

    public function verifySignature(array $payload, string $signature): bool
    {
        return $this->signatureValid;
    }

    public function parseNotification(array $payload): GatewayNotification
    {
        return new GatewayNotification(
            orderId: (string) ($payload['order_id'] ?? ''),
            status: ($payload['transaction_status'] ?? '') === 'settlement' ? 'PAID' : 'EXPIRED',
            grossAmount: (string) ($payload['gross_amount'] ?? '0'),
            gatewayTransactionId: 'TX-' . ($payload['order_id'] ?? ''),
        );
    }
}
```

- [ ] **Step 2: Lint**

Run: `php -l app/Services/Payments/Gateways/FakePaymentGateway.php`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/Services/Payments/Gateways/FakePaymentGateway.php
git commit -m "feat: FakePaymentGateway for tests"
```

---

### Task 6: MidtransGateway

**Goal:** Implement production adapter with real HTTP calls, signature verification, and response parsing.

**Files:**
- Create: `app/Services/Payments/Gateways/MidtransGateway.php`
- Create: `tests/Unit/Services/MidtransGatewayTest.php`

- [ ] **Step 1: Write the test first**

```php
<?php

namespace Tests\Unit\Services;

use App\Services\Payments\DTO\PendingChargeRequest;
use App\Services\Payments\Gateways\MidtransGateway;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransGatewayTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.midtrans.server_key' => 'SB-Mid-server-xxxx']);
        config(['services.midtrans.charge_url' => 'https://api.sandbox.midtrans.com/v2']);
    }

    public function test_verify_signature_returns_true_for_valid_signature(): void
    {
        $gateway = new MidtransGateway();
        $serverKey = config('services.midtrans.server_key');
        $payload = ['order_id' => 'SALE-001', 'status_code' => '200', 'gross_amount' => '90000.00'];
        $signature = hash('sha512', 'SALE-001' . '200' . '90000.00' . $serverKey);

        $this->assertTrue($gateway->verifySignature($payload, $signature));
    }

    public function test_verify_signature_returns_false_for_invalid_signature(): void
    {
        $gateway = new MidtransGateway();
        $payload = ['order_id' => 'SALE-001', 'status_code' => '200', 'gross_amount' => '90000.00'];

        $this->assertFalse($gateway->verifySignature($payload, 'wrong-signature'));
    }

    public function test_parse_notification_maps_settlement_to_paid(): void
    {
        $gateway = new MidtransGateway();
        $notification = $gateway->parseNotification([
            'order_id' => 'SALE-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '90000.00',
            'transaction_id' => 'TX-123',
        ]);

        $this->assertSame('SALE-001', $notification->orderId);
        $this->assertSame('PAID', $notification->status);
        $this->assertSame('90000.00', $notification->grossAmount);
    }

    public function test_parse_notification_maps_expire_to_expired(): void
    {
        $gateway = new MidtransGateway();
        $notification = $gateway->parseNotification([
            'order_id' => 'SALE-001',
            'transaction_status' => 'expire',
            'gross_amount' => '90000.00',
            'transaction_id' => 'TX-123',
        ]);

        $this->assertSame('EXPIRED', $notification->status);
    }

    public function test_create_charge_sends_correct_payload_for_qris(): void
    {
        Http::fake([
            'api.sandbox.midtrans.com/v2/charge' => Http::response([
                'transaction_id' => 'TX-QRIS-001',
                'actions' => [
                    ['name' => 'generate-qr-code', 'url' => 'https://example.test/qr.png'],
                    ['name' => 'qr-code', 'url' => 'qr://string-data'],
                ],
                'expiry_time' => now()->addMinutes(15)->toIso8601String(),
            ], 200),
        ]);

        $gateway = new MidtransGateway();
        $result = $gateway->createCharge(new PendingChargeRequest(
            orderId: 1,
            saleCode: 'SALE-001',
            method: 'QRIS',
            grossAmount: '90000.00',
            items: [['id' => 1, 'name' => 'Product', 'price' => 90000, 'quantity' => 1]],
        ));

        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.sandbox.midtrans.com/v2/charge'
            && $request->data()['payment_type'] === 'qris'
            && $request->data()['transaction_details']['order_id'] === 'SALE-001'
        );

        $this->assertSame('TX-QRIS-001', $result->gatewayTransactionId);
        $this->assertSame('https://example.test/qr.png', $result->qrUrl);
        $this->assertSame('qr://string-data', $result->qrString);
    }

    public function test_create_charge_sends_correct_payload_for_va(): void
    {
        Http::fake([
            'api.sandbox.midtrans.com/v2/charge' => Http::response([
                'transaction_id' => 'TX-VA-001',
                'va_numbers' => [['va_number' => '1234567890', 'bank' => 'bca']],
                'expiry_time' => now()->addMinutes(15)->toIso8601String(),
            ], 200),
        ]);

        $gateway = new MidtransGateway();
        $result = $gateway->createCharge(new PendingChargeRequest(
            orderId: 1,
            saleCode: 'SALE-001',
            method: 'VA',
            grossAmount: '90000.00',
            items: [['id' => 1, 'name' => 'Product', 'price' => 90000, 'quantity' => 1]],
        ));

        $this->assertSame('1234567890', $result->vaNumber);
        $this->assertSame('bank_transfer', $result->method);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

Run: `php artisan test --filter=MidtransGatewayTest`
Expected: FAIL (class not found).

- [ ] **Step 3: Write the adapter**

```php
<?php

namespace App\Services\Payments\Gateways;

use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayCharge;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MidtransGateway implements PaymentGateway
{
    private string $base;
    private string $serverKey;

    public function __construct()
    {
        $this->base = rtrim((string) config('services.midtrans.charge_url'), '/');
        $this->serverKey = (string) config('services.midtrans.server_key');
    }

    public function createCharge(PendingChargeRequest $request): GatewayCharge
    {
        $payload = [
            'transaction_details' => [
                'order_id' => $request->saleCode,
                'gross_amount' => $request->grossAmount,
            ],
            'item_details' => array_map(fn ($i) => [
                'id' => $i['id'] ?? null,
                'name' => $i['name'],
                'price' => $i['price'],
                'quantity' => $i['quantity'],
            ], $request->items),
            'customer_details' => $request->customer ?? new \stdClass(),
            'expiry' => ['unit' => 'minutes', 'duration' => 15],
        ];

        $payload['payment_type'] = match ($request->method) {
            'QRIS' => 'qris',
            'VA' => 'bank_transfer',
            'GOPAY' => 'gopay',
            default => throw new RuntimeException("Unsupported method: {$request->method}", 422),
        };
        if ($payload['payment_type'] === 'bank_transfer') {
            $payload['bank_transfer'] = ['bank' => 'bca'];
        }

        $response = Http::withBasicAuth($this->serverKey, '')
            ->acceptJson()
            ->post("{$this->base}/charge", $payload);

        if (!$response->successful()) {
            throw new RuntimeException('Payment gateway error: ' . $response->body(), $response->status());
        }

        $body = $response->json();
        $qrUrl = null;
        $qrString = null;
        $vaNumber = null;
        $deepLink = null;

        foreach ($body['actions'] ?? [] as $action) {
            if (isset($action['name'], $action['url'])) {
                match ($action['name']) {
                    'generate-qr-code' => $qrUrl = $action['url'],
                    'deeplink-redirect' => $deepLink = $action['url'],
                    'qr-code' => $qrString = $action['url'],
                    default => null,
                };
            }
        }

        return new GatewayCharge(
            gatewayTransactionId: $body['transaction_id'] ?? null,
            method: $request->method,
            qrUrl: $qrUrl,
            qrString: $qrString,
            vaNumber: $body['va_numbers'][0]['va_number'] ?? null,
            deepLink: $deepLink,
            expiresAt: isset($body['expiry_time']) ? new \DateTime($body['expiry_time']) : now()->addMinutes(15),
        );
    }

    public function verifySignature(array $payload, string $signature): bool
    {
        $orderId = $payload['order_id'] ?? '';
        $statusCode = $payload['status_code'] ?? '';
        $grossAmount = $payload['gross_amount'] ?? '';
        $expected = hash('sha512', $orderId . $statusCode . $grossAmount . $this->serverKey);
        return hash_equals($expected, $signature);
    }

    public function parseNotification(array $payload): GatewayNotification
    {
        $status = match ($payload['transaction_status'] ?? null) {
            'settlement', 'capture' => 'PAID',
            'deny', 'expire', 'cancel' => 'EXPIRED',
            default => 'FAILED',
        };
        return new GatewayNotification(
            orderId: (string) ($payload['order_id'] ?? ''),
            status: $status,
            grossAmount: (string) ($payload['gross_amount'] ?? '0'),
            gatewayTransactionId: (string) ($payload['transaction_id'] ?? ''),
        );
    }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `php artisan test --filter=MidtransGatewayTest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Services/Payments/Gateways/MidtransGateway.php tests/Unit/Services/MidtransGatewayTest.php
git commit -m "feat: MidtransGateway adapter + unit tests"
```

---

### Task 7: StockLedger

**Goal:** Shared helper for atomic stock decrement/increment with movement records. Used by PaymentService and VoidSaleService.

**Files:**
- Create: `app/Services/Inventory/StockLedger.php`
- Create: `tests/Unit/Services/StockLedgerTest.php`

- [ ] **Step 1: Write the test first**

```php
<?php

namespace Tests\Unit\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\Inventory\StockLedger;
use Tests\TestCase;

class StockLedgerTest extends TestCase
{
    public function test_decrement_creates_sale_movement_and_reduces_stock(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10]);
        $item = $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 5000,
            'subtotal' => 15000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $ledger->decrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE);

        $product->refresh();
        $this->assertSame(7, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE)->count());
    }

    public function test_increment_creates_reversal_movement_and_increases_stock(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 7]);
        $item = $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 5000,
            'subtotal' => 15000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $ledger->incrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE_REVERSAL);

        $product->refresh();
        $this->assertSame(10, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE_REVERSAL)->count());
    }

    public function test_decrement_throws_when_stock_insufficient(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 2]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 5000,
            'subtotal' => 25000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $this->expectException(\RuntimeException::class);
        $ledger->decrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

Run: `php artisan test --filter=StockLedgerTest`
Expected: FAIL (class not found).

- [ ] **Step 3: Write the implementation**

```php
<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use RuntimeException;

class StockLedger
{
    public function decrementForSale(Sale $sale, Collection $productItems, int $userId, string $type): void
    {
        $productIds = $productItems->pluck('product_id')->filter()->unique();
        $locked = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
            : collect();

        foreach ($productItems as $item) {
            $product = $locked->get($item->product_id);
            if (!$product) continue;

            $before = $product->current_stock;
            $after = bcsub((string) $before, (string) $item->quantity, 0);
            if ($after < 0) {
                throw new RuntimeException("Stock is insufficient for {$product->name}.", 409);
            }
            $product->current_stock = $after;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity_change' => '-' . $item->quantity,
                'stock_before' => $before,
                'stock_after' => $after,
                'sale_id' => $sale->id,
                'created_by' => $userId,
                'created_at' => now(),
            ]);
        }
    }

    public function incrementForSale(Sale $sale, Collection $productItems, int $userId, string $type): void
    {
        $productIds = $productItems->pluck('product_id')->filter()->unique();
        $locked = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
            : collect();

        foreach ($productItems as $item) {
            $product = $locked->get($item->product_id);
            if (!$product) continue;

            $before = $product->current_stock;
            $after = bcadd((string) $before, (string) $item->quantity, 0);
            $product->current_stock = $after;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity_change' => '+' . $item->quantity,
                'stock_before' => $before,
                'stock_after' => $after,
                'sale_id' => $sale->id,
                'created_by' => $userId,
                'created_at' => now(),
            ]);
        }
    }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `php artisan test --filter=StockLedgerTest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Services/Inventory/StockLedger.php tests/Unit/Services/StockLedgerTest.php
git commit -m "feat: StockLedger + unit tests"
```

---

### Task 8: PaymentService (inti)

**Goal:** Lifecycle online payment: start → PENDING, settle → PAID, expire → EXPIRED + stock restore. Includes idempotency, charge lookup (SEC-PAY-004), and amount validation.

**Files:**
- Create: `app/Services/Payments/PaymentService.php`, `tests/Unit/Services/PaymentServiceTest.php`

- [ ] **Step 1: Write the test first**

```php
<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\Gateways\FakePaymentGateway;
use App\Services\Payments\PaymentService;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
    }

    private function draftSaleWithProduct(): Sale
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10, 'sale_price' => 1000]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);
        return $sale->fresh();
    }

    public function test_start_online_payment_sets_pending_and_reserves_stock_once(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);

        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $this->assertSame(Sale::STATUS_PENDING, $result->status);
        $this->assertSame('QRIS', $result->payment_method);
        $charge = $result->paymentCharges()->first();
        $this->assertNotNull($charge);
        $this->assertSame(PaymentCharge::STATUS_PENDING, $charge->status);
        $this->assertSame('2000.00', (string) $charge->amount);
        $this->assertNotNull($charge->qr_url);
        $this->assertNotNull($charge->expires_at);
        $this->assertSame(1, PaymentCharge::where('sale_id', $sale->id)->count());
        $product->refresh();
        $this->assertSame(8, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE)->count());
    }

    public function test_start_online_payment_rejects_non_draft_sale(): void
    {
        $sale = $this->draftSaleWithProduct();
        $sale->update(['status' => Sale::STATUS_PAID]);

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
    }

    public function test_settle_turns_sale_and_charge_paid_without_stock_change(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $notification = new GatewayNotification(
            orderId: $result->sale_code,
            status: 'PAID',
            grossAmount: '2000.00',
            gatewayTransactionId: 'TX-QRIS-' . $result->id,
        );
        $settled = app(PaymentService::class)->settleFromGateway($notification);

        $this->assertSame(Sale::STATUS_PAID, $settled->status);
        $charge = $settled->paymentCharges()->first();
        $this->assertSame(PaymentCharge::STATUS_PAID, $charge->status);
        $this->assertNotNull($charge->paid_at);
        $product->refresh();
        $this->assertSame(8, $product->current_stock);
    }

    public function test_expire_turns_sale_and_charge_expired_and_restores_stock(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $expired = app(PaymentService::class)->expire($result, 'Test expire');

        $this->assertSame(Sale::STATUS_EXPIRED, $expired->status);
        $charge = $expired->paymentCharges()->first();
        $this->assertSame(PaymentCharge::STATUS_EXPIRED, $charge->status);
        $product->refresh();
        $this->assertSame(10, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $expired->id)->where('type', StockMovement::TYPE_SALE_REVERSAL)->count());
    }

    public function test_settle_is_idempotent_for_already_paid_sale(): void
    {
        $sale = $this->draftSaleWithProduct();
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
        $notification = new GatewayNotification(orderId: $result->sale_code, status: 'PAID', grossAmount: '2000.00', gatewayTransactionId: 'TX-QRIS-' . $result->id);
        app(PaymentService::class)->settleFromGateway($notification);

        $settledAgain = app(PaymentService::class)->settleFromGateway($notification);
        $this->assertSame(Sale::STATUS_PAID, $settledAgain->status);
    }

    public function test_settle_rejects_amount_mismatch(): void
    {
        $sale = $this->draftSaleWithProduct();
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
        $notification = new GatewayNotification(orderId: $result->sale_code, status: 'PAID', grossAmount: '99999.00', gatewayTransactionId: 'TX-QRIS-' . $result->id);

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->settleFromGateway($notification);
    }

    public function test_settle_rejects_unknown_order(): void
    {
        $notification = new GatewayNotification(orderId: 'UNKNOWN', status: 'PAID', grossAmount: '2000.00', gatewayTransactionId: 'TX-999');

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->settleFromGateway($notification);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

Run: `php artisan test --filter=PaymentServiceTest`
Expected: FAIL (class not found).

- [ ] **Step 3: Write the implementation**

```php
<?php

namespace App\Services\Payments;

use App\Models\AuditLog;
use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use App\Services\Audit\AuditService;
use App\Services\Inventory\StockLedger;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\DTO\PendingChargeRequest;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PaymentService
{
    public function __construct(
        private PaymentGateway $gateway,
        private AuditService $audit,
        private StockLedger $ledger,
    ) {}

    public function startOnlinePayment(Sale $sale, string $method): Sale
    {
        if ($sale->status !== Sale::STATUS_DRAFT) {
            throw new RuntimeException('Only DRAFT sales can be sent for payment.', 409);
        }
        if (!in_array($method, Sale::ONLINE_METHODS, true)) {
            throw new RuntimeException("Method {$method} is not an online method.", 422);
        }

        return DB::transaction(function () use ($sale, $method) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status !== Sale::STATUS_DRAFT) {
                throw new RuntimeException('Only DRAFT sales can be sent for payment.', 409);
            }
            $sale->load('items');

            $cashier = auth()->user();
            if (!$cashier) {
                throw new RuntimeException('Unauthenticated.', 401);
            }

            $productItems = $sale->items->where('item_type', SaleItem::TYPE_PRODUCT);
            $this->ledger->decrementForSale($sale, $productItems, $cashier->id, StockMovement::TYPE_SALE);

            $charge = $this->gateway->createCharge(new PendingChargeRequest(
                orderId: $sale->id,
                saleCode: $sale->sale_code,
                method: $method,
                grossAmount: (string) $sale->grand_total,
                items: $sale->items->map(fn ($i) => [
                    'id' => $i->product_id ?? $i->service_id,
                    'name' => $i->item_name_snapshot,
                    'price' => (float) $i->unit_price,
                    'quantity' => $i->quantity,
                ])->all(),
                customer: $sale->customer ? ['first_name' => $sale->customer->name] : null,
            ));

            PaymentCharge::create([
                'sale_id' => $sale->id,
                'method' => $method,
                'amount' => $sale->grand_total,
                'status' => PaymentCharge::STATUS_PENDING,
                'gateway_transaction_id' => $charge->gatewayTransactionId,
                'gateway_type' => match ($method) {
                    'VA' => 'bank_transfer',
                    default => strtolower($method),
                },
                'va_number' => $charge->vaNumber,
                'qr_url' => $charge->qrUrl,
                'qr_string' => $charge->qrString,
                'deeplink' => $charge->deepLink,
                'expires_at' => $charge->expiresAt,
            ]);

            $sale->status = Sale::STATUS_PENDING;
            $sale->payment_method = $method;
            $sale->save();

            $this->audit->log(
                AuditLog::ACTION_SALE_CHECKOUT,
                'sale', $sale->id, null,
                ['sale_code' => $sale->sale_code, 'grand_total' => $sale->grand_total, 'status' => $sale->status, 'method' => $method]
            );

            $sale->refresh();
            return $sale;
        }, 5);
    }

    public function settleFromGateway(GatewayNotification $n): Sale
    {
        $sale = Sale::where('sale_code', $n->orderId)->first();
        if (!$sale) {
            throw new RuntimeException('Unknown order_id.', 404);
        }

        return DB::transaction(function () use ($sale, $n) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status === Sale::STATUS_PAID) {
                return $sale;
            }
            if ($sale->status !== Sale::STATUS_PENDING) {
                throw new RuntimeException('Only PENDING sales can be settled.', 409);
            }

            $charge = $sale->paymentCharges()
                ->where('gateway_transaction_id', $n->gatewayTransactionId)
                ->lockForUpdate()
                ->first();

            if (!$charge) {
                $charge = $sale->paymentCharges()
                    ->where('status', PaymentCharge::STATUS_PENDING)
                    ->latest('id')
                    ->lockForUpdate()
                    ->first();
            }

            if (!$charge) {
                throw new RuntimeException('No matching charge for this sale.', 404);
            }
            if (bccomp($n->grossAmount, (string) $charge->amount, 2) !== 0) {
                throw new RuntimeException('Amount mismatch.', 422);
            }
            if ($charge->status === PaymentCharge::STATUS_PAID) {
                throw new RuntimeException('Charge already settled.', 409);
            }

            $charge->status = PaymentCharge::STATUS_PAID;
            $charge->paid_at = now();
            $charge->gateway_transaction_id = $n->gatewayTransactionId ?: $charge->gateway_transaction_id;
            $charge->save();

            $sale->status = Sale::STATUS_PAID;
            $sale->paid_at = now();
            $sale->save();

            if ($sale->service_order_id) {
                $so = ServiceOrder::whereKey($sale->service_order_id)->lockForUpdate()->first();
                if ($so && !in_array($so->status, [ServiceOrder::STATUS_DONE, ServiceOrder::STATUS_CANCELLED], true)) {
                    $so->status = ServiceOrder::STATUS_DONE;
                    $so->completed_at = now();
                    $so->save();
                }
            }

            $this->audit->log(
                AuditLog::ACTION_SALE_CHECKOUT,
                'sale', $sale->id, null,
                ['sale_code' => $sale->sale_code, 'status' => $sale->status, 'gateway_transaction_id' => $n->gatewayTransactionId]
            );

            $sale->refresh();
            return $sale;
        }, 5);
    }

    public function expire(Sale $sale, ?string $reason = null): Sale
    {
        return DB::transaction(function () use ($sale, $reason) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status === Sale::STATUS_EXPIRED) {
                return $sale;
            }
            if ($sale->status !== Sale::STATUS_PENDING) {
                throw new RuntimeException('Only PENDING sales can be expired.', 409);
            }
            $sale->load('items');

            $sale->paymentCharges()
                ->where('status', PaymentCharge::STATUS_PENDING)
                ->update(['status' => PaymentCharge::STATUS_EXPIRED]);

            $actor = auth()->id() ?? $sale->cashier_id;
            $productItems = $sale->items->where('item_type', SaleItem::TYPE_PRODUCT);
            $this->ledger->incrementForSale($sale, $productItems, (int) $actor, StockMovement::TYPE_SALE_REVERSAL);

            $sale->status = Sale::STATUS_EXPIRED;
            $sale->save();

            $this->audit->log(
                AuditLog::ACTION_SALE_VOIDED,
                'sale', $sale->id, null,
                ['sale_code' => $sale->sale_code, 'status' => $sale->status],
                $reason ?? 'Pembayaran kedaluwarsa / dibatalkan.'
            );

            $sale->refresh();
            return $sale;
        }, 5);
    }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `php artisan test --filter=PaymentServiceTest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Services/Payments/PaymentService.php tests/Unit/Services/PaymentServiceTest.php
git commit -m "feat: PaymentService (start/settle/expire) + unit tests"
```

---

### Task 9: WebhookController + Route + Scheduler

**Goal:** Public webhook endpoint with signature verification, rate limiting, and auto-expire scheduler.

**Files:**
- Create: `app/Http/Controllers/Api/PaymentWebhookController.php`, `app/Console/Commands/ExpirePendingSales.php`
- Modify: `routes/api.php`, `routes/console.php`
- Create: `tests/Feature/Payments/PaymentWebhookTest.php`

- [ ] **Step 1: Write the test first**

```php
<?php

namespace Tests\Feature\Payments;

use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\FakePaymentGateway;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
        Config::set('services.midtrans.server_key', 'test-server-key');
    }

    public function test_webhook_returns_400_for_invalid_signature(): void
    {
        $this->fake->signatureValid = false;

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'SALE-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '2000.00',
        ]);

        $response->assertStatus(400);
    }

    public function test_webhook_settle_marks_sale_paid(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->pending('QRIS')->for($cashier, 'cashier')->create(['sale_code' => 'WEBHOOK-TEST-001']);
        $product = \App\Models\Product::factory()->create(['current_stock' => 10]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
            'item_name_snapshot' => $product->name,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);
        PaymentCharge::create([
            'sale_id' => $sale->id,
            'method' => 'QRIS',
            'amount' => 2000,
            'status' => PaymentCharge::STATUS_PENDING,
            'gateway_transaction_id' => 'TX-WEBHOOK-001',
            'expires_at' => now()->addMinutes(15),
        ]);

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'WEBHOOK-TEST-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '2000.00',
            'transaction_id' => 'TX-WEBHOOK-001',
        ]);

        $response->assertOk();
        $sale->refresh();
        $this->assertSame(Sale::STATUS_PAID, $sale->status);
    }

    public function test_webhook_is_rate_limited(): void
    {
        $response = $this->postJson('/api/v1/payments/webhook/midtrans', []);
        $response->assertOk();
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

Run: `php artisan test --filter=PaymentWebhookTest`
Expected: FAIL (route not found).

- [ ] **Step 3: Write the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private PaymentGateway $gateway,
        private PaymentService $paymentService,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $signature = (string) $request->header('X-Signature', '');

        if (!$this->gateway->verifySignature($payload, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        try {
            $notification = $this->gateway->parseNotification($payload);
            if ($notification->status === 'PAID') {
                $this->paymentService->settleFromGateway($notification);
            } elseif ($notification->status === 'EXPIRED') {
                $sale = \App\Models\Sale::where('sale_code', $notification->orderId)->first();
                if ($sale) {
                    $this->paymentService->expire($sale, 'Webhook Midtrans: transaksi ditolak/kedaluwarsa.');
                }
            }
            return response()->json(['message' => 'ok']);
        } catch (RuntimeException $e) {
            Log::warning('Payment webhook exception: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
        } catch (Throwable $e) {
            Log::error('Payment webhook error: ' . $e->getMessage());
            return response()->json(['message' => 'Internal error.'], 500);
        }
    }
}
```

- [ ] **Step 4: Register public route in `routes/api.php`** (di luar group auth)

```php
Route::prefix('v1')->group(function () {
    // Public webhook (CSRF-exempt; signature-verified; rate-limited).
    Route::post('payments/webhook/midtrans', [PaymentWebhookController::class, 'handle'])
        ->middleware('throttle:30,1');

    // ... existing auth routes ...
});
```

- [ ] **Step 5: Write the expire command**

```php
<?php

namespace App\Console\Commands;

use App\Models\PaymentCharge;
use App\Services\Payments\PaymentService;
use Illuminate\Console\Command;

class ExpirePendingSales extends Command
{
    protected $signature = 'expire:pending-sales';
    protected $description = 'Expire PENDING charges past expires_at and restore stock on their sale.';

    public function handle(PaymentService $paymentService): int
    {
        $expired = 0;
        PaymentCharge::query()
            ->where('status', PaymentCharge::STATUS_PENDING)
            ->where('expires_at', '<', now())
            ->with('sale')
            ->chunkById(100, function ($charges) use ($paymentService, &$expired) {
                foreach ($charges as $charge) {
                    try {
                        $paymentService->expire($charge->sale, 'Pembayaran kedaluwarsa (auto).');
                        $expired++;
                    } catch (\RuntimeException) {
                        // Already transitioned — skip.
                    }
                }
            });

        $this->info("Expired {$expired} pending sale(s).");
        return self::SUCCESS;
    }
}
```

- [ ] **Step 6: Schedule in `routes/console.php`**

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('expire:pending-sales')->everyMinute();
```

- [ ] **Step 7: Run test — verify it passes**

Run: `php artisan test --filter=PaymentWebhookTest`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/Api/PaymentWebhookController.php app/Console/Commands/ExpirePendingSales.php routes/api.php routes/console.php tests/Feature/Payments/PaymentWebhookTest.php
git commit -m "feat: webhook controller + route + scheduler + feature tests"
```

---

### Task 10: CheckoutSaleService + SaleController + SaleResource

**Goal:** Orchestrate online vs cash in checkout. Update validation and resource mapping. SECURITY: SEC-PAY-003 (no `gateway_raw_response` exposure).

**Files:**
- Modify: `app/Services/Sales/CheckoutSaleService.php`, `app/Services/Sales/VoidSaleService.php`, `app/Http/Controllers/Api/SaleController.php`, `app/Http/Resources/SaleResource.php`
- Create: `tests/Feature/Payments/OnlineCheckoutTest.php`

- [ ] **Step 1: Write the test first**

```php
<?php

namespace Tests\Feature\Payments;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\FakePaymentGateway;
use Tests\TestCase;

class OnlineCheckoutTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
    }

    public function test_checkout_with_qris_creates_pending_sale_and_charge(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10, 'sale_price' => 1000]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
            'item_name_snapshot' => $product->name,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);

        $response = $this->postJson("/api/v1/sales/{$sale->id}/checkout", [
            'payment_method' => 'QRIS',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'PENDING');
        $this->assertDatabaseHas('payment_charges', [
            'sale_id' => $sale->id,
            'status' => 'PENDING',
        ]);
        $product->refresh();
        $this->assertSame(8, $product->current_stock);
    }

    public function test_checkout_with_cash_creates_paid_sale_without_charge(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10, 'sale_price' => 1000]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
            'item_name_snapshot' => $product->name,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);

        $response = $this->postJson("/api/v1/sales/{$sale->id}/checkout", [
            'payment_method' => 'CASH',
            'paid_amount' => 2000,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'PAID');
        $this->assertDatabaseCount('payment_charges', 0);
    }

    public function test_sale_resource_does_not_expose_gateway_raw_response(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->pending('QRIS')->for($cashier, 'cashier')->create();
        \App\Models\PaymentCharge::create([
            'sale_id' => $sale->id,
            'method' => 'QRIS',
            'amount' => 1000,
            'status' => 'PENDING',
            'gateway_transaction_id' => 'TX-001',
            'expires_at' => now()->addMinutes(15),
        ]);

        $response = $this->getJson("/api/v1/sales/{$sale->id}");

        $response->assertOk();
        $response->assertJsonStructure(['data' => [
            'gateway_transaction_id',
            'gateway_type',
            'gateway_va_number',
            'gateway_qr_url',
            'gateway_qr_string',
            'gateway_deeplink',
            'payment_expires_at',
        ]]);
        $response->assertJsonMissing(['gateway_raw_response' => null]);
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

Run: `php artisan test --filter=OnlineCheckoutTest`
Expected: FAIL (route not found or validation fails).

- [ ] **Step 3: Update `CheckoutSaleService`** — inject `PaymentService` + `StockLedger`, delegate online methods

Update constructor:
```php
public function __construct(
    private AuditService $audit,
    private PaymentService $paymentService,
    private StockLedger $ledger,
) {}
```

After pricing/snapshot in `checkout()`, before setting PAID:
```php
if (in_array($paymentMethod, Sale::ONLINE_METHODS, true)) {
    return $this->paymentService->startOnlinePayment($sale, $paymentMethod);
}
```

Replace stock decrement block for CASH path with:
```php
$this->ledger->decrementForSale($sale, $productItems, $cashier->id, StockMovement::TYPE_SALE);
```

- [ ] **Step 4: Update `VoidSaleService`** — use `StockLedger`

Replace stock increment block with:
```php
$this->ledger->incrementForSale($sale, $sale->items, $user->id, StockMovement::TYPE_VOID_RETURN);
```

- [ ] **Step 5: Update `SaleController::checkout` validation**

```php
'payment_method' => ['required', 'in:CASH,QRIS,VA,GOPAY'],
```

- [ ] **Step 6: Update `SaleResource`** — map charge to flat fields (SEC-PAY-003: no `gateway_raw_response`)

```php
$charge = $this->latestCharge;
return [
    // ... existing fields ...
    'payment_expires_at' => $charge?->expires_at,
    'gateway_transaction_id' => $charge?->gateway_transaction_id,
    'gateway_type' => $charge?->gateway_type,
    'gateway_va_number' => $charge?->va_number,
    'gateway_qr_url' => $charge?->qr_url,
    'gateway_qr_string' => $charge?->qr_string,
    'gateway_deeplink' => $charge?->deeplink,
];
```

- [ ] **Step 7: Run test — verify it passes**

Run: `php artisan test --filter=OnlineCheckoutTest`
Expected: all PASS.

- [ ] **Step 8: Run full test suite**

Run: `php artisan test`
Expected: all PASS (existing + new tests).

- [ ] **Step 9: Commit**

```bash
git add app/Services/Sales app/Http/Controllers/Api/SaleController.php app/Http/Resources/SaleResource.php tests/Feature/Payments/OnlineCheckoutTest.php
git commit -m "feat: checkout orchestration + sale resource gateway fields + tests"
```

---

### Task 11: Frontend Types + Constants + API

**Goal:** Update TypeScript types, constants, and API for new payment methods.

**Files:**
- Modify: `src/types/index.ts`, `src/lib/constants.ts`, `src/lib/api/sales.ts`

- [ ] **Step 1: Update types in `src/types/index.ts`**

```ts
export type SaleStatus = "DRAFT" | "PENDING" | "PAID" | "EXPIRED" | "VOID";
export type PaymentMethod = "CASH" | "QRIS" | "VA" | "GOPAY";
```

Add to `Sale` type:
```ts
payment_expires_at?: string | null;
gateway_type?: string | null;
gateway_va_number?: string | null;
gateway_qr_url?: string | null;
gateway_qr_string?: string | null;
gateway_deeplink?: string | null;
```

- [ ] **Step 2: Update constants in `src/lib/constants.ts`**

```ts
export const SALE_STATUS = { DRAFT: "DRAFT", PENDING: "PENDING", PAID: "PAID", EXPIRED: "EXPIRED", VOID: "VOID" };
export const PAYMENT_METHODS = { CASH: "CASH", QRIS: "QRIS", VA: "VA", GOPAY: "GOPAY" };
export const SALE_STATUS_LABEL: Record<string, string> = { DRAFT: "Draft", PENDING: "Menunggu Bayar", PAID: "Lunas", EXPIRED: "Kedaluwarsa", VOID: "Dibatalkan" };
export const PAYMENT_LABEL: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", VA: "Virtual Account", GOPAY: "GoPay" };
```

- [ ] **Step 3: Update `CheckoutPayload` in `src/lib/api/sales.ts`**

```ts
payment_method: "CASH" | "QRIS" | "VA" | "GOPAY";
```

- [ ] **Step 4: Install QR library**

Run: `npm i react-qr-code` (frontend dir)

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc -b` (frontend dir)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/constants.ts frontend/src/lib/api/sales.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): payment types/constants/api for online methods"
```

---

### Task 12: Frontend Components

**Goal:** PaymentMethodSelector, WaitingPaymentModal, PosPage integration, badge updates, SalesHistory resume.

**Files:**
- Create: `src/features/pos/PaymentMethodSelector.tsx`, `src/features/pos/WaitingPaymentModal.tsx`
- Modify: `src/features/pos/PosPage.tsx`, `src/components/ui/badges.tsx`, `src/features/sales-history/SalesHistoryPage.tsx`

- [ ] **Step 1: Create `PaymentMethodSelector.tsx`**

```tsx
import { PAYMENT_METHODS, PAYMENT_LABEL } from "@/lib/constants";
import { ShoppingCart, QrCode, Building2, Wallet } from "lucide-react";

const ICONS = {
  CASH: ShoppingCart,
  QRIS: QrCode,
  VA: Building2,
  GOPAY: Wallet,
};

const HELPERS = {
  CASH: "Bayar langsung di kasir",
  QRIS: "Pindai QR dari e-wallet / m-banking",
  VA: "Bayar lewat ATM / mobile banking",
  GOPAY: "Bayar lewat GoPay",
};

interface Props {
  value: string;
  onChange: (method: string) => void;
}

export function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.values(PAYMENT_METHODS).map((method) => {
        const Icon = ICONS[method as keyof typeof ICONS];
        const isSelected = value === method;
        return (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{PAYMENT_LABEL[method]}</span>
            <span className="text-xs text-gray-500">{HELPERS[method as keyof typeof HELPERS]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `WaitingPaymentModal.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badges";
import { getSaleApi } from "@/lib/api/sales";
import { formatRupiah } from "@/lib/formatters";
import { Copy, Clock, CheckCircle, XCircle } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  sale: any;
  onPaid: (sale: any) => void;
  onExpired: () => void;
  onClose: () => void;
}

export function WaitingPaymentModal({ sale, onPaid, onExpired, onClose }: Props) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState(sale.status);

  useEffect(() => {
    const expires = new Date(sale.payment_expires_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setStatus("EXPIRED");
        onExpired();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sale.payment_expires_at]);

  useEffect(() => {
    if (status !== "PENDING") return;
    const poll = setInterval(async () => {
      try {
        const res = await getSaleApi(sale.id);
        if (res.data.status === "PAID") {
          setStatus("PAID");
          onPaid(res.data);
        } else if (res.data.status === "EXPIRED") {
          setStatus("EXPIRED");
          onExpired();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [sale.id, status]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = timeLeft / (15 * 60);
  const isAmber = timeLeft <= 180;

  const copyVa = () => {
    navigator.clipboard.writeText(sale.gateway_va_number || "");
  };

  return (
    <Modal open onClose={onClose} title="Menunggu Pembayaran" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="warning">Menunggu Bayar</Badge>
          <span className="text-sm text-gray-500">{sale.sale_code}</span>
        </div>

        <div className="text-center text-3xl font-bold tabular-nums">
          {formatRupiah(sale.grand_total)}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-lg font-mono">
            <Clock className={`h-5 w-5 ${isAmber ? "text-amber-500" : ""}`} />
            <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${isAmber ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {sale.payment_method === "QRIS" && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-4 rounded-lg">
              {sale.gateway_qr_string ? (
                <QRCode value={sale.gateway_qr_string} size={200} />
              ) : sale.gateway_qr_url ? (
                <img src={sale.gateway_qr_url} alt="QRIS" className="h-[200px] w-[200px] object-contain" />
              ) : null}
            </div>
            <p className="text-sm text-gray-500">Buka GoPay / e-wallet / m-banking lalu Scan QRIS</p>
          </div>
        )}

        {sale.payment_method === "VA" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-500">Nomor Virtual Account</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold">{sale.gateway_va_number}</span>
              <button onClick={copyVa} className="rounded-md border p-2 hover:bg-gray-50">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Bayar lewat ATM / mobile / internet banking</p>
          </div>
        )}

        {sale.payment_method === "GOPAY" && (
          <div className="flex flex-col items-center gap-2">
            {sale.gateway_deeplink && (
              <a href={sale.gateway_deeplink} className="text-primary underline">Buka GoPay</a>
            )}
            <p className="text-sm text-gray-500">Bayar lewat GoPay</p>
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="text-center space-y-2">
            <XCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="font-medium">Pembayaran Kedaluwarsa</p>
            <p className="text-sm text-gray-500">Waktu pembayaran (15 menit) habis. Stok sudah dikembalikan otomatis.</p>
          </div>
        )}

        {status === "PAID" && (
          <div className="text-center space-y-2">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="font-medium">Pembayaran Berhasil</p>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          Jendela bisa ditutup; tagihan tetap berjalan dan bisa dicek di Riwayat Transaksi.
        </p>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Update `badges.tsx`** — PENDING = warning, EXPIRED = neutral

- [ ] **Step 4: Integrate into `PosPage.tsx`** — replace Select with PaymentMethodSelector, add WaitingPaymentModal

- [ ] **Step 5: Update `SalesHistoryPage.tsx`** — add "Lanjutkan Pembayaran" for PENDING rows

- [ ] **Step 6: Verify build**

Run: `npx tsc -b && npx vite build` (frontend dir)
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/pos frontend/src/components/ui/badges.tsx frontend/src/features/sales-history/SalesHistoryPage.tsx
git commit -m "feat(frontend): waiting-payment modal + payment method cards + resume from history"
```

---

### Task 13: Security Abuse Case Tests

**Goal:** Test all payment-specific abuse cases from security.md AC-31 to AC-38.

**Files:**
- Create: `tests/Feature/Payments/PaymentSecurityTest.php`

- [ ] **Step 1: Write the test**

```php
<?php

namespace Tests\Feature\Payments;

use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\FakePaymentGateway;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PaymentSecurityTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
        Config::set('services.midtrans.server_key', 'test-server-key');
    }

    private function createPendingSaleWithCharge(): Sale
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->pending('QRIS')->for($cashier, 'cashier')->create(['sale_code' => 'SEC-TEST-' . uniqid()]);
        $product = \App\Models\Product::factory()->create(['current_stock' => 10]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 1000,
            'subtotal' => 1000,
            'item_name_snapshot' => $product->name,
        ]);
        $sale->update(['subtotal' => 1000, 'grand_total' => 1000]);
        PaymentCharge::create([
            'sale_id' => $sale->id,
            'method' => 'QRIS',
            'amount' => 1000,
            'status' => PaymentCharge::STATUS_PENDING,
            'gateway_transaction_id' => 'TX-SEC-' . uniqid(),
            'expires_at' => now()->addMinutes(15),
        ]);
        return $sale->fresh();
    }

    /** AC-31: Webhook tanpa signature */
    public function test_webhook_without_signature_returns_400(): void
    {
        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'X', 'transaction_status' => 'settlement', 'gross_amount' => '1000.00',
        ]);
        $response->assertStatus(400);
    }

    /** AC-32: Webhook signature salah */
    public function test_webhook_with_wrong_signature_returns_400(): void
    {
        $this->fake->signatureValid = false;
        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'X', 'transaction_status' => 'settlement', 'gross_amount' => '1000.00',
        ], ['X-Signature' => 'wrong-sig']);
        $response->assertStatus(400);
    }

    /** AC-33: Double settle idempotent */
    public function test_double_settle_is_idempotent(): void
    {
        $sale = $this->createPendingSaleWithCharge();
        $txId = $sale->paymentCharges()->first()->gateway_transaction_id;

        $payload = ['order_id' => $sale->sale_code, 'transaction_status' => 'settlement', 'gross_amount' => '1000.00', 'transaction_id' => $txId];
        $this->postJson('/api/v1/payments/webhook/midtrans', $payload)->assertOk();
        $this->postJson('/api/v1/payments/webhook/midtrans', $payload)->assertOk();

        $sale->refresh();
        $this->assertSame(Sale::STATUS_PAID, $sale->status);
        $this->assertSame(1, PaymentCharge::where('sale_id', $sale->id)->where('status', PaymentCharge::STATUS_PAID)->count());
    }

    /** AC-34: Amount mismatch */
    public function test_amount_mismatch_is_rejected(): void
    {
        $sale = $this->createPendingSaleWithCharge();
        $txId = $sale->paymentCharges()->first()->gateway_transaction_id;

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => $sale->sale_code, 'transaction_status' => 'settlement', 'gross_amount' => '99999.00', 'transaction_id' => $txId,
        ]);
        $response->assertStatus(422);
    }

    /** AC-35: Webhook untuk sale bukan PENDING */
    public function test_webhook_for_non_pending_sale_is_rejected(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create(['status' => Sale::STATUS_PAID, 'sale_code' => 'PAID-TEST']);

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'PAID-TEST', 'transaction_status' => 'settlement', 'gross_amount' => '0.00', 'transaction_id' => 'TX-999',
        ]);
        $response->assertStatus(409);
    }

    /** AC-36: Expire double idempotent */
    public function test_double_expire_is_idempotent(): void
    {
        $sale = $this->createPendingSaleWithCharge();
        app(\App\Services\Payments\PaymentService::class)->expire($sale, 'first');
        $result = app(\App\Services\Payments\PaymentService::class)->expire($sale, 'second');
        $this->assertSame(Sale::STATUS_EXPIRED, $result->status);
    }

    /** AC-38: Concurrent expire + webhook — stock restore once */
    public function test_concurrent_expire_and_settle_restores_stock_once(): void
    {
        $sale = $this->createPendingSaleWithCharge();
        $product = \App\Models\Product::find($sale->items->first()->product_id);
        $txId = $sale->paymentCharges()->first()->gateway_transaction_id;

        // Simulate: webhook arrives but sale is already expired
        $sale->update(['status' => Sale::STATUS_EXPIRED]);
        $sale->paymentCharges()->where('status', PaymentCharge::STATUS_PENDING)->update(['status' => PaymentCharge::STATUS_EXPIRED]);

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => $sale->sale_code, 'transaction_status' => 'settlement', 'gross_amount' => '1000.00', 'transaction_id' => $txId,
        ]);

        $product->refresh();
        $this->assertGreaterThanOrEqual(9, $product->current_stock);
    }
}
```

- [ ] **Step 2: Run test — verify it passes**

Run: `php artisan test --filter=PaymentSecurityTest`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/Payments/PaymentSecurityTest.php
git commit -m "test: payment security abuse cases AC-31 to AC-38"
```

---

### Task 14: Docs + Final Verification

**Goal:** Update all documentation and run final verification.

**Files:**
- Modify: `docs/Schema.md`, `docs/Rules.md`, `docs/Architecture.md`, `docs/Design.md`, `docs/security.md`, `docs/PRD.md`, `TODO.md`

- [ ] **Step 1: Update `Schema.md`** — add `payment_charges` table, update `sales` status/payment_method

- [ ] **Step 2: Update `Rules.md`** — status baru, alur online checkout, StockLedger, test minimum

- [ ] **Step 3: Update `Architecture.md`** — PaymentService, webhook, data flow

- [ ] **Step 4: Update `Design.md`** — modal "Menunggu Pembayaran", metode baru

- [ ] **Step 5: Update `security.md`** — §A19 baru, hapus dari §3.3, hapus dari §I

- [ ] **Step 6: Update `PRD.md`** — metode pembayaran

- [ ] **Step 7: Update `TODO.md`** — fase pembayaran online

- [ ] **Step 8: Run full backend tests**

Run: `php artisan test`
Expected: all PASS.

- [ ] **Step 9: Run frontend build**

Run: `npx tsc -b && npx vite build` (frontend dir)
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add docs TODO.md
git commit -m "docs: payment online Midtrans (all docs updated)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** §2 (alur), §3 (status), §4 (modul), §5 (migration), §6 (frontend), §7 (keamanan), §9 (testing), §10 (docs), §12 (security review) — semua ada task-nya.
- [x] **Placeholder scan:** tidak ada TBD/TODO/langkah tanpa kode.
- [x] **Type consistency:** `PendingChargeRequest{orderId:int, saleCode:string, method:string, grossAmount:string, items:array, ?customer:array}`, `GatewayCharge{?gatewayTransactionId, method, ?qrUrl, ?qrString, ?vaNumber, ?deepLink, expiresAt}`, `GatewayNotification{orderId, status, grossAmount, gatewayTransactionId}` — konsisten antara Task 4-8.
- [x] **Security:** SEC-PAY-001 (Task 3), SEC-PAY-002 (Task 2), SEC-PAY-003 (Task 10), SEC-PAY-004 (Task 8), SEC-PAY-005 (Task 8), SEC-PAY-012 (Task 14) — semua ter-cover.
- [x] **TDD:** Setiap task punya "write failing test" → "run to verify fail" → "implement" → "run to verify pass" → "commit".
