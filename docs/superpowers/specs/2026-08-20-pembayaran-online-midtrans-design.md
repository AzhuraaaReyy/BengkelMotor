# Spesifikasi Desain — Pembayaran Online via Midtrans (QRIS / VA / GoPay)

**Tanggal:** 2026-08-20
**Status:** Disetujui (struktur modul disetujui user; dokumen ini merangkum desain final)

---

## 1. Ringkasan

Menambahkan pembayaran online resmi pada POS bengkel menggunakan **Midtrans (GoTo)** sebagai payment gateway. Metode pembayaran online menggantikan metode manual `TRANSFER` dan `QRIS` yang sudah ada; **Tunai** tetap dipertahankan sebagai metode langsung.

Metode yang didukung:

- **Tunai (CASH)** — alur lama, langsung PAID.
- **QRIS** — QR dinamis per transaksi, ditampilkan di layar POS.
- **Virtual Account (VA)** — nomor VA bank, ditampilkan di layar POS.
- **GoPay** — wallet GoPay, deeplink/QR ditampilkan di layar POS.

Keputusan yang disepakati user:

| Keputusan | Pilihan |
|---|---|
| Gateway | Midtrans (GoTo) |
| Siklus transaksi online | Sale berstatus **PENDING** sampai konfirmasi webhook |
| Stok | **Reserve saat checkout** (berkurang segera, dikembalikan jika kedaluwarsa/batal) |
| Metode manual lama | **Diganti penuh** oleh gateway online |
| Masa berlaku pembayaran | **15 menit** |

---

## 2. Alur Transaksi

### 2.1 Tunai (tidak berubah)

1. Kasir pilih metode **Tunai** di POS.
2. `CheckoutSaleService::checkout()` — jalur lama.
3. Sale langsung `PAID`, stok berkurang, `StockMovement` SALE dibuat, nota tampil.

### 2.2 Online (QRIS / VA / GoPay)

1. Kasir pilih metode **QRIS / VA / GoPay** di POS.
2. Backend menghitung subtotal/total + snapshot harga (bagian existing checkout).
3. `PaymentService::startOnlinePayment()`:
   - Lock baris sale + produk (`lockForUpdate`).
   - Reserve stok: stok berkurang + `StockMovement` SALE dibuat.
   - Panggil `PaymentGateway::createCharge()` (Charge API Midtrans).
   - **Buat row `payment_charges`**: `amount = grand_total`, `expires_at = now() + 15 menit`, `method`, `status = PENDING`, dan data gateway (`gateway_transaction_id`, `gateway_type`, `gateway_va_number`, `gateway_qr_url`/`qr_string`, `gateway_deeplink`).
   - `sales.status = PENDING`, `sales.payment_method = method`.
   - Audit `PAYMENT_STARTED`.
4. Frontend menampilkan modal **"Menunggu Pembayaran"**: QR image / nomor VA / deeplink GoPay + countdown 15 menit + tombol "Cek Status" + polling otomatis (~5 detik).
5. Midtrans mengirim webhook saat pelanggan membayar.
6. `PaymentWebhookController` → `PaymentService::settleFromGateway()`:
   - Verifikasi signature + amount (**`gross_amount == charge.amount`**) + `order_id == sale_code`.
   - Temukan charge: match `gateway_transaction_id`, fallback charge PENDING terbaru sale.
   - Idempoten (tolak jika sale sudah PAID/VOID/EXPIRED atau charge sudah PAID/EXPIRED).
   - `charge.status = PAID`, `charge.paid_at = now()`; `sales.status = PAID`, `sales.paid_at = now()`, tanpa perubahan stok.
   - Service order tertaut otomatis `DONE` (hanya di settle).
   - Audit `PAYMENT_SETTLED` (`ACTION_SALE_CHECKOUT`), raw payload webhook disimpan ke `audit_log.after_data` (tanpa header signature).
7. Frontend mendeteksi status PAID → nota tampil.

### 2.3 Kedaluwarsa / Batal (Online)

- **Auto-expire:** job terjadwal menandai charge PENDING yang lewat `expires_at` → `status = EXPIRED` + sale terkait `EXPIRED` + **restore stok** (`StockMovement` SALE_REVERSAL, note alasan).
- **Webhook expire/cancel/deny** dari Midtrans → jalur yang sama (idempoten).
- **Batal manual PENDING** oleh kasir/admin: `PaymentService::expire(sale, reason)` — sama, charge EXPIRED + sale EXPIRED + restore stok.
- Restore stok hanya terjadi sekali (idempoten + lock).

---

## 3. Status Sale

`sales.status` diperluas:

| Status | Makna |
|---|---|
| DRAFT | Keranjang dibuka, belum checkout |
| PENDING | Checkout online, menunggu pembayaran (stok sudah reserve) |
| PAID | Pembayaran sukses (tunai langsung, online via webhook) |
| EXPIRED | Pembayaran kedaluwarsa / dibatalkan / ditolak (stok dikembalikan) |
| VOID | Dibatalkan Admin setelah PAID (alasan wajib) |

Transisi valid: `DRAFT → PENDING → PAID | EXPIRED`; `PAID → VOID`; `PENDING → EXPIRED`.

---

## 4. Struktur Modul

Mengikuti prinsip **deep module** (codebase-design): interface kecil, implementasi dalam, seam pada posisi yang tepat.

### 4.1 Port `PaymentGateway` (seam eksternal — true external dependency)

Interface kecil; seluruh pengetahuan Midtrans (HTTP Charge API, payload, SHA512 signature, mapping status) tersembunyi.

```php
interface PaymentGateway
{
    public function createCharge(PendingChargeRequest $request): GatewayCharge;
    public function verifySignature(array $payload, string $signature): bool;
    public function parseNotification(array $payload): GatewayNotification;
}
```

DTO interface:

- `PendingChargeRequest{ orderId, grossAmount, method, items, customer? }`
- `GatewayCharge{ gatewayTransactionId, method, qrUrl?, qrString?, vaNumber?, deepLink?, expiresAt }`
- `GatewayNotification{ orderId, status: PAID|EXPIRED|FAILED, grossAmount, gatewayTransactionId }`

Adapter: `MidtransGateway` (produksi, memakai Laravel HTTP) + `FakePaymentGateway` (test). Dua adapter = seam nyata.

Lokasi: `app/Services/Payments/Contracts/PaymentGateway.php`, `app/Services/Payments/Gateways/MidtransGateway.php`, `app/Services/Payments/Gateways/FakePaymentGateway.php`, DTO di `app/Services/Payments/DTO/`.

### 4.2 `PaymentService` (deep module inti)

Interface 3 method, di belakangnya seluruh lifecycle online + konservasi stok + idempotensi + audit.

```php
class PaymentService
{
    public function startOnlinePayment(Sale $sale, string $method): Sale;
    public function settleFromGateway(GatewayNotification $n): Sale;
    public function expire(Sale $sale, ?string $reason = null): Sale;
}
```

Yang disembunyikan:

- Idempotensi + `lockForUpdate` pada baris sale dan charge (`payment_charges`).
- Lifecycle charge: start membuat row PENDING; settle/expire mengubah status charge + sale secara konsisten.
- Stock ledger: reserve saat start, restore saat expire (konsisten Rules.md §9).
- Validasi `gross_amount` webhook == `charge.amount` (bukan sekadar `grand_total`).
- Audit log tiap event (start/settle/expire) + raw payload webhook.
- Service order otomatis DONE hanya saat settle.
- Kebijakan expiry 15 menit + job terjadwal auto-expire.

Lokasi: `app/Services/Payments/PaymentService.php`.

### 4.3 Orkestrasi checkout

Satu pintu masuk tetap `CheckoutSaleService::checkout()`:

- **Tunai** → jalur lama (pricing → snapshot → stok → PAID).
- **Online** → pricing + snapshot, lalu delegasi `PaymentService::startOnlinePayment()`.

`PaymentService` + port `PaymentGateway` di-inject via constructor (`CheckoutSaleService`).

### 4.4 Webhook

`PaymentWebhookController` tipis: verifikasi signature → `parseNotification` → `settleFromGateway()`.

Raw payload webhook disimpan ke `audit_log.after_data` (tanpa header signature / secret) untuk rekonsiliasi dan forensik.

Route publik: `POST /api/v1/payments/webhook/midtrans` (tanpa auth session, tanpa `role`).

---

## 5. Perubahan Database (Migration)

Migration baru `2026_08_20_100016_add_payment_gateway.php`:

**`sales` (modifikasi minimal):**
- `status`: konversi dari enum ke `string` dengan default `DRAFT` (nilai: `DRAFT, PENDING, PAID, EXPIRED, VOID`). Konversi ke string (bukan alter enum) agar portabel SQLite+MySQL dan validasi diperkuat di aplikasi (lihat §8). Nilai lama `DRAFT/PAID/VOID` dipetakan apa adanya; tidak ada data status lain di produksi.
- `payment_method`: konversi dari enum ke `string` nullable (nilai baru: `CASH, QRIS, VA, GOPAY`). Nilai lama `TRANSFER/OTHER` tidak digunakan lagi — migrasi memetakan `TRANSFER` → `VA` dan `OTHER` → `QRIS` bila ada data lama yang perlu dipertahankan untuk laporan.
- **Tidak ada kolom gateway di `sales`** — data gateway dipindah ke tabel `payment_charges` (keputusan desain final 2026-08-20). Index `status, paid_at` tetap.

**Tabel baru `payment_charges`** (ledger charge terpisah dari invoice — keputusan desain final 2026-08-20):

| Column | Type | Null | Constraint / Notes |
|---|---:|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| sale_id | BIGINT UNSIGNED | NO | FK -> sales.id |
| method | VARCHAR(20) | NO | `QRIS` \| `VA` \| `GOPAY` |
| amount | DECIMAL(15,2) | NO | gross_amount yang dikirim ke gateway |
| status | VARCHAR(20) | NO | default `PENDING`; `PENDING` \| `PAID` \| `EXPIRED` \| `FAILED` |
| gateway_transaction_id | VARCHAR(100) | YES | **UNIQUE** (anti duplikasi referensi charge) |
| gateway_type | VARCHAR(20) | YES | `qris` \| `bank_transfer` \| `gopay` |
| va_number | VARCHAR(50) | YES | |
| qr_url | TEXT | YES | |
| qr_string | TEXT | YES | |
| deeplink | TEXT | YES | |
| expires_at | DATETIME | YES | |
| paid_at | DATETIME | YES | |
| created_at / updated_at | TIMESTAMP | YES | |

Indexes: `(sale_id)`, `(status, expires_at)` (untuk job auto-expire), UNIQUE `gateway_transaction_id`.

Aturan (validasi di service, bukan DB — portabel SQLite):

- `method` ∈ {QRIS, VA, GOPAY}; `amount >= 0`.
- Online ⟹ minimal satu target terisi: `va_number` XOR (`qr_url` / `qr_string`) XOR `deeplink`.
- CASH tidak pernah membuat row `payment_charges`.
- `sales.payment_method` disimpan di level sale (satu sale = satu metode), sesuai keputusan.

---

## 6. Perubahan Frontend

### 6.1 POS (`PosPage.tsx`)

- Pilihan metode: **Tunai / QRIS / VA / GoPay**.
- Tunai → alur lama.
- Online → setelah checkout sukses (sale PENDING), tampil modal **"Menunggu Pembayaran"**:
  - QRIS: tampilkan QR image (`gateway_qr_url`) atau QR string (`gateway_qr_string` → render ke QR).
  - VA: tampilkan nomor VA (`gateway_va_number`) + instruksi salin.
  - GoPay: tampilkan deeplink/QR (`gateway_deeplink` / `gateway_qr_url`).
  - Countdown 15 menit (`payment_expires_at`).
  - Tombol "Cek Status" + polling otomatis ~5 detik ke `GET /sales/{id}` sampai status `PAID` → tampil nota. Jika `EXPIRED` → pesan kedaluwarsa, kembali ke keranjang (stok sudah otomatis dikembalikan backend).

### 6.2 Badge / label

- Metode: CASH → "Tunai", QRIS → "QRIS", VA → "Virtual Account", GOPAY → "GoPay".
- Status baru: PENDING → "Menunggu Bayar", EXPIRED → "Kedaluwarsa".
- Diterapkan di: `SalesHistoryPage`, `ReceiptView`, `DashboardPage` (recent sales), filter status.

### 6.3 Types & constants

- `types/index.ts`: `SaleStatus` + `PaymentMethod` diperluas (PENDING, EXPIRED; QRIS, VA, GOPAY).
- Tambah field gateway pada `Sale` type (opsional).
- `lib/constants.ts`: `PAYMENT_METHODS`, `PAYMENT_LABEL`, `SALE_STATUS_LABEL` disesuaikan.

---

## 7. Keamanan

- Server Key Midtrans **hanya di server** (`.env` + `config/services.php`); tidak pernah ke frontend.
- Webhook: verifikasi `X-Signature` (SHA512 `orderId + status_code + gross_amount + server_key`), cocokkan `gross_amount` ke `charge.amount`, `order_id == sale_code`. Tolak bila tidak valid → 400.
- **`payment_charges.gateway_transaction_id` UNIQUE** → referensi charge tidak bisa diduplikasi / disetel dua kali.
- Webhook idempoten (transisi ganda ditolak via status sale + charge + lock).
- Tidak ada secret di log/audit; raw payload disimpan tanpa header signature.
- Stok reserve mencegah overselling; restore hanya satu kali.
- RBAC tidak berubah: checkout shared (Admin & Kasir), void PAID Admin-only, dashboard/report Admin-only.

---

## 8. Catatan Implementasi / Gotcha

- **MySQL enum:** mengubah enum pada tabel berisi data bisa gagal/berisiko di MySQL. Strategi: ubah `status` dan `payment_method` ke `string`/`varchar` di migration baru (lebih portabel, konsisten dengan SQLite test) lalu perkuat validasi di aplikasi (Form Request / service). Ini juga menghapus kebutuhan migrate enum fragile.
- **Webhook lokal:** butuh URL publik (ngrok) atau simulator sandbox Midtrans (dashboard Midtrans punya fitur simulator). Dokumentasikan di `docs/security.md`.
- **Kredensial:** user menyediakan Server Key / Client Key di `.env`. `config/services.php` menyimpan konfigurasi Midtrans (`server_key`, `client_key`, `is_production`, `merchant_id`, `snap_url`/`charge_url`, `webhook_secret`).
- **`order_id` = `sale_code`:** unik, manusiawi, mudah direferensikan saat audit. Pastikan panjang sesuai (`VARCHAR(40)`).
- **BCMath:** semua perhitungan uang tetap `bcmul`/`bcadd`/`bcsub` (konsisten dengan existing).
- **Job terjadwal:** `routes/console.php` + scheduler (`schedule:work` di dev, cron di prod) untuk auto-expire PENDING. Default: jalankan tiap menit.

---

## 9. Testing

- **Unit `PaymentService`** (dengan `FakePaymentGateway`):
  - start → PENDING + stok berkurang sekali + **row `payment_charges` dibuat sekali** (amount = grand_total, status PENDING, data gateway tersimpan).
  - settle → charge PAID + sale PAID, tanpa perubahan stok.
  - expire → charge EXPIRED + sale EXPIRED + stok dikembalikan sekali.
  - settle/expire ganda ditolak (idempoten).
  - `gross_amount` tidak cocok dengan `charge.amount` ditolak.
  - `order_id` tidak dikenal ditolak.
- **Unit `MidtransGateway`**: build payload charge (QRIS/VA/GoPay), parse respons, verifikasi signature benar/salah, mapping status.
- **Feature** (`Http::fake()` untuk Midtrans):
  - Checkout online → PENDING + stok berkurang + charge PENDING.
  - Webhook settlement → charge PAID + sale PAID; stok tidak berubah.
  - Webhook expire → charge EXPIRED + sale EXPIRED + stok kembali.
  - Signature invalid → 400.
  - Tunai tetap langsung PAID (tanpa row `payment_charges`).
  - RBAC tidak berubah (matriks tetap hijau).
  - Service order tertaut DONE hanya saat settle.
  - Auto-expire job menandai charge PENDING lewat batas → EXPIRED + restore.
- Test lama yang menguji perilaku yang sama lewat implementasi lama **dihapus** (replace, don't layer).

---

## 10. Dokumen yang Diupdate (protokol Rules.md §16)

| Dokumen | Perubahan |
|---|---|
| `Schema.md` | §9 sales: status baru, payment_method baru; **tabel baru `payment_charges`**; catatan migration |
| `Rules.md` | §3 (status baru), §9 (alur online + reserve/restore + charge), §13 (test minimum) |
| `Architecture.md` | Payment service, webhook, data flow online, struktur `app/Services/Payments/` |
| `Design.md` | §3.5/§6: modal "Menunggu Pembayaran", metode baru |
| `security.md` | §A: webhook signature, penyimpanan secret, alur webhook lokal; **§A19 baru**: Payment Gateway & Webhook Security (rate limit, CSRF exception, mass assignment, raw response, PII, abuse cases); §3.3: hapus payment gateway dari NOT included; §I: hapus payment gateway dari restrictions |
| `PRD.md` | §metode pembayaran: tunai, QRIS, VA, GoPay |
| `TODO.md` | Fase baru pembayaran online |

---

## 12. Keamanan Pembayaran (Security Review Findings)

Hasil security review mendalam (2026-08-20) terhadap seluruh attack surface: schema, flow, middleware, CSRF, CORS, mass assignment, RBAC, frontend XSS.

### 12.1 Temuan High (Wajib diperbaiki sebelum deploy)

**SEC-PAY-001: CSRF Blocking Webhook POST**
- Route webhook di dalam middleware group `auth:sanctum` → `VerifyCsrfToken` aktif → Midtrans POST ditolak `419 Token Mismatch`.
- **Fix:** Route webhook dideklarasikan di **luar** group `auth:sanctum` + tambah exception di `VerifyCsrfToken`:
  ```php
  $middleware->validateCsrfTokens(except: ['api/v1/payments/webhook/*']);
  ```

**SEC-PAY-002: PaymentCharge Mass Assignment**
- `PaymentCharge` model harus melindungi field sensitif (`status`, `paid_at`, `gateway_transaction_id`) dari mass assignment.
- **Fix:** `$guarded = []` ATAU `$fillable` sangat terbatas; hanya `PaymentService` yang mengubah `status` dan `paid_at`.

**SEC-PAY-003: `gateway_raw_response` Bocor ke API Response**
- Raw API response Midtrans (berisi merchant key, internal IDs) tidak boleh ter-expose ke frontend.
- **Fix:** `SaleResource` **JANGAN** map `gateway_raw_response`. Hanya map field yang dibutuhkan: `gateway_status`, `gateway_transaction_id`, `gateway_va_number`, `gateway_qr_url`, `gateway_qr_string`, `gateway_deeplink`, `payment_expires_at`.

### 12.2 Temuan Medium (Perlu diantisipasi)

**SEC-PAY-004: Charge Lookup Fallback Bisa Match Salah**
- Query settle menggunakan `orWhere('status', PENDING)` → bisa match charge yang salah jika ada 2+ PENDING charges.
- **Fix:** Match by `gateway_transaction_id` dulu; fallback ke PENDING terbaru hanya sebagai last resort.

**SEC-PAY-005: Race Condition Webhook vs Auto-Expire**
- `lockForUpdate()` melindungi, tapi DB lock timeout bisa menyebabkan stock restore dua kali.
- **Fix:** Idempoten check sebelum restore (`if status === EXPIRED return`); cek `hasOpenCharge` sebelum restore stok.

**SEC-PAY-006: Raw Webhook Payload Menyimpan PII**
- Payload Midtrans berisi customer name, phone, email. Disimpan di `audit_log.after_data`.
- **Mitigation:** `audit-logs` route admin-only; tambahkan catatan di `security.md` §A14.

**SEC-PAY-007: LIKE Wildcard di Search Sale**
- `SaleController::index` tidak escape wildcard `%` dan `_` di search input.
- **Fix:** Escape sebelum query LIKE.

**SEC-PAY-008: CORS Allows Any Origin**
- Default CORS hanya localhost (aman). Tapi production harus set `CORS_ALLOWED_ORIGINS` secara eksplisit.
- **Dokumentasi:** Tambahkan catatan di `security.md`.

### 12.3 Temuan Low (Hardening)

**SEC-PAY-009: Charge ID Tidak Di-Audit**
- Audit log mencatat `sale_code` tapi tidak `payment_charge.id`. Tambahkan di audit trail.

**SEC-PAY-010: `webhook_secret` Config Tidak Dipakai**
- `MIDTRANS_WEBHOOK_SECRET` di `.env` tidak dipakai oleh `verifySignature()` → hapus atau rename.

**SEC-PAY-011: Checkout Rate Limiting untuk Online**
- Pertimbangkan throttle khusus untuk online checkout (opsional).

**SEC-PAY-012: `security.md` Tidak Cover Payment Gateway**
- `security.md` §3.3 mencantumkan "Payment gateway" di "NOT included" → perlu diupdate.

### 12.4 Security Checklist untuk Payment Feature

| # | Checklist | Status |
|---|-----------|--------|
| 1 | Webhook route di luar auth:sanctum group | Wajib |
| 2 | CSRF exception untuk webhook route | Wajib |
| 3 | Webhook rate limit (`throttle:30,1`) | Wajib |
| 4 | Signature = `hash_equals()` (timing-safe) | Wajib |
| 5 | PaymentCharge mass assignment protected | Wajib |
| 6 | `gateway_raw_response` tidak di-expose | Wajib |
| 7 | Charge lookup by transaction_id first | Direkomendasikan |
| 8 | Idempotent settle/expire (status check) | Direkomendasikan |
| 9 | Raw payload di audit tanpa signature headers | Sudah ada |
| 10 | Charge ID di audit trail | Direkomendasikan |
| 11 | `webhook_secret` unused config dihapus | Direkomendasikan |
| 12 | security.md updated untuk payment | Wajib |

---

## 13. Ruang Lingkup (Out of Scope / Ditunda)

- **Retry / multi-attempt** pembayaran per sale (beberapa charge aktif per sale) — ditunda; sekarang satu sale = satu charge, namun struktur `payment_charges` (1:N) sudah mendukung perluasan ini.
- Refund otomatis ke pelanggan (Midtrans refund) — di luar MVP; void tetap manual oleh Admin.
- Laporan segmentasi per sub-metode gateway — `payment_method` di level sale sudah cukup.
- Halaman hosted Snap Midtrans — memakai Core Charge API agar QR/VA/deeplink tampil inline di POS.