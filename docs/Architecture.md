# Architecture.md

## 1. Tujuan Arsitektur

Arsitektur Bengkel POS & Monitoring dirancang untuk memenuhi kebutuhan MVP bengkel motor dengan dua role aplikasi, yaitu Admin dan Kasir. Fokus teknisnya adalah kesederhanaan implementasi, konsistensi data transaksi dan stok, kemudahan maintenance, serta akses dashboard jarak jauh melalui browser.

Sistem menggunakan pola **SPA frontend + REST API backend + relational database**. Tidak ada microservice pada MVP karena domain bisnis masih cukup kecil dan penggunaan microservice akan menambah deployment, observability, dan consistency overhead yang belum diperlukan.

---

## 2. Technology Stack

### 2.1 Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- HTTP client berbasis Fetch/Axios-equivalent
- Library chart untuk dashboard/laporan

**Alasan:**

- React cocok untuk aplikasi POS/dashboard yang memiliki banyak state interaktif.
- TypeScript mengurangi kesalahan kontrak data antara frontend dan backend.
- Vite memberikan development environment yang sederhana dan cepat.
- Tailwind memudahkan konsistensi design system tanpa membuat CSS global yang sulit dirawat.

### 2.2 Backend

- Laravel REST API
- Laravel validation
- Laravel policies/gates atau authorization middleware
- Database transaction untuk proses kritis

**Alasan:**

- Laravel menyediakan routing, validation, authentication, authorization, ORM, migration, transaction, logging, dan testing dalam satu framework.
- Monolithic API lebih sesuai untuk MVP dibanding memecah sistem menjadi banyak service.

### 2.3 Database

- MySQL 8 atau versi kompatibel yang digunakan pada environment produksi.

**Alasan:**

- Data POS, stok, dan servis bersifat relasional.
- Foreign key, unique constraint, transaction, dan index penting untuk menjaga integritas data.

### 2.4 Deployment

Minimal terdiri dari:

1. Frontend web.
2. Backend API.
3. MySQL database.

Frontend dan backend dapat ditempatkan pada layanan yang sama atau berbeda. Keputusan hosting tidak dikunci oleh dokumen ini karena bergantung pada provider yang dipilih, tetapi environment production wajib menggunakan HTTPS dan backup database.

---

## 3. High-Level Architecture

```text
[Browser Admin/Kasir]
        |
        | HTTPS / JSON
        v
[React SPA]
        |
        | REST API
        v
[Laravel Application]
   |        |        |
   |        |        +--> Audit Logging
   |        +-----------> Authorization / Validation
   +--------------------> Domain Services
                            |
                            v
                         [MySQL]
```

Tidak terdapat service mekanik karena mekanik bukan pengguna aplikasi. Mekanik hanya direpresentasikan sebagai record pada tabel `mechanics`.

---

## 4. Backend Logical Layers

```text
HTTP Request
   -> Route
   -> Middleware/Auth
   -> Controller
   -> Form Request Validation
   -> Application/Domain Service
   -> Model/Repository Query
   -> MySQL
   -> Resource/Response DTO
   -> JSON Response
```

### 4.1 Controller

Controller hanya menangani request/response dan tidak menampung business logic besar.

### 4.2 Form Request / Validator

Berisi validasi input seperti:

- jumlah item > 0,
- harga tidak negatif,
- role valid,
- metode pembayaran valid,
- tanggal valid,
- foreign key tersedia.

### 4.3 Domain/Application Services

Business flow kritis ditempatkan pada service class, misalnya:

- `CheckoutSaleService`
- `VoidSaleService`
- `AdjustStockService`
- `DashboardQueryService`
- `ReportQueryService`

Tujuannya agar aturan bisnis tidak tersebar di controller.

### 4.4 Model / Query Layer

Eloquent model digunakan untuk relasi dan persistence. Query agregasi berat untuk dashboard/laporan dapat ditempatkan pada query object/service agar model tidak menjadi terlalu besar.

---

## 5. Frontend Structure

Struktur yang direkomendasikan:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── auth/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── pos/
│   │   ├── service-orders/
│   │   ├── customers/
│   │   ├── mechanics/
│   │   ├── products/
│   │   ├── services/
│   │   ├── expenses/
│   │   ├── reports/
│   │   ├── users/
│   │   └── audit/
│   ├── lib/
│   │   ├── api/
│   │   ├── formatters/
│   │   ├── validators/
│   │   └── constants/
│   ├── types/
│   └── main.tsx
└── package.json
```

**Keputusan:** struktur berbasis fitur dipilih agar file terkait satu domain tidak tersebar berdasarkan tipe teknis saja.

---

## 6. Backend Structure

```text
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Models/
│   ├── Services/
│   │   ├── Sales/
│   │   ├── Inventory/
│   │   ├── ServiceOrders/
│   │   ├── Reports/
│   │   └── Audit/
│   ├── Policies/
│   ├── Enums/
│   └── Support/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   └── api.php
└── tests/
    ├── Feature/
    └── Unit/
```

---

## 7. Data Flow Utama

### 7.1 Login

```text
User -> Login Form -> Auth API -> Validate Credentials
     -> Create Auth Session/Token -> Return User + Role
     -> Frontend loads permitted routes
```

Frontend boleh menyembunyikan menu berdasarkan role, tetapi backend tetap menjadi sumber otorisasi final.

### 7.2 Checkout POS

```text
Kasir
 -> Create/Edit DRAFT Sale
 -> Add Products/Services
 -> POST checkout
 -> Backend validates sale + stock
 -> BEGIN DB TRANSACTION
      -> lock required product rows
      -> verify current stock
      -> snapshot unit price + purchase price
      -> mark sale PAID
      -> create SALE stock movements
      -> decrement product.current_stock
      -> create audit record
 -> COMMIT
 -> return paid sale + receipt data
```

Jika salah satu langkah gagal, transaction di-rollback sehingga tidak ada kondisi transaksi PAID tetapi stok belum berkurang, atau sebaliknya.

### 7.3 Void Transaksi

```text
Admin
 -> Submit VOID + reason
 -> Backend checks role ADMIN and current status PAID
 -> BEGIN DB TRANSACTION
      -> mark sale VOID
      -> create VOID_RETURN stock movements
      -> increment product.current_stock
      -> create audit log with reason
 -> COMMIT
```

Transaksi tidak dihapus.

### 7.4 Order Servis

```text
Kasir
 -> search/create customer
 -> create service order
 -> select mechanic master
 -> update service status
 -> when finished create/link POS sale
 -> checkout using normal POS flow
```

Pendapatan servis tetap berasal dari `sales`, bukan dari `service_orders`.

### 7.5 Dashboard

```text
Admin Browser
 -> GET /dashboard?from=&to=
 -> Backend aggregates PAID sales, VOID data, expenses, service orders, products
 -> return summary JSON
 -> Frontend renders KPI cards + charts + low-stock table
```

### 7.6 Report

```text
Admin -> choose date range -> GET report endpoint
      -> backend executes aggregate query
      -> returns paginated/detail data
      -> optional export endpoint generates spreadsheet/PDF
```

---

## 8. Data Consistency Decisions

### 8.1 Pemasukan Tidak Memiliki Tabel Manual Terpisah

Pemasukan dihitung dari transaksi `sales` berstatus `PAID`. Ini mencegah pencatatan satu transaksi dua kali.

### 8.2 Snapshot Harga

`sale_items` menyimpan:

- nama item snapshot,
- harga jual snapshot,
- harga beli snapshot untuk produk.

Alasannya, perubahan harga master di masa depan tidak boleh mengubah laporan transaksi historis.

### 8.3 Current Stock + Stock Movement

`products.current_stock` disimpan untuk membaca stok secara cepat. Setiap perubahan terhadapnya harus memiliki record `stock_movements` yang sesuai.

Keputusan ini memberikan:

- pembacaan cepat untuk POS,
- histori untuk audit,
- kemampuan rekonsiliasi.

### 8.4 Database Lock Saat Checkout

Checkout harus mengunci row produk yang terlibat selama validasi dan pengurangan stok untuk menghindari race condition jika dua Kasir menjual produk terakhir secara bersamaan.

### 8.5 Soft/Immutable History

Transaksi PAID, VOID, dan stock movement tidak di-hard-delete melalui UI normal. Koreksi dilakukan melalui tindakan domain seperti VOID atau ADJUSTMENT agar histori tetap tersedia.

---

## 9. API Boundary yang Direkomendasikan

Prefix contoh: `/api/v1`

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Dashboard

- `GET /dashboard`

### Sales / POS

- `GET /sales`
- `POST /sales`
- `GET /sales/{id}`
- `PUT /sales/{id}` untuk DRAFT
- `POST /sales/{id}/checkout`
- `POST /sales/{id}/void` ADMIN only

### Service Orders

- `GET /service-orders`
- `POST /service-orders`
- `GET /service-orders/{id}`
- `PUT /service-orders/{id}`

### Products

- CRUD products, dengan write dibatasi sesuai role.
- Endpoint stock adjustment (`adjust-stock`) shared Admin & Kasir; hanya master produk (create/update + Harga Beli) yang Admin-only.
- `POST products/{product}/adjust-stock` menerima **delta bertanda** (`quantity`), bukan nilai absolut; `type` PURCHASE/ADJUSTMENT/OPENING, `note` wajib. `AdjustStockService` mengeksekusi dalam satu transaksi DB: lock produk → update stok → `stock_movements` → commit. Atur Stok tidak membuat `Expense`; pengeluaran hanya dicatat manual oleh Admin melalui Manajemen Pengeluaran.
- `GET products?include_cost=1` mengekspos `purchase_price` untuk non-admin **hanya** pada halaman Produk & Stok. POS/catalog tidak mengirim flag, jadi tetap tanpa harga beli.
- `GET products/{product}/movements` (shared) mengembalikan riwayat stok yang sudah di-enrich: `direction` (IN/OUT), `created_by_name` (petugas), `sale_code` (referensi transaksi bila ada), `expense_amount` (nullable untuk histori legacy).
- `GET products/low-stock` (shared, dideklarasikan sebelum `products/{product}`) — daftar produk aktif dengan `current_stock < 5` (threshold notifikasi) + counts; tanpa field sensitif.
- `ExpenseController::update` menolak (403 `EXPENSE_LOCKED`) expense `source = 'STOCK_PURCHASE'`.

### Services

- CRUD master jasa, write Admin.

### Customers / Mechanics

- CRUD sesuai permission.

### Expenses

- CRUD Admin.

### Reports

- `GET /reports/sales`
- `GET /reports/services`
- `GET /reports/inventory`
- `GET /reports/finance`
- export endpoints Admin.

### Users

- CRUD akun Kasir oleh Admin.

### Audit

- `GET /audit-logs` Admin only.

Endpoint final dapat berubah mengikuti implementasi, tetapi boundary domain di atas harus dipertahankan.

---

## 10. Authentication dan Authorization

- Backend menentukan akses berdasarkan `users.role`.
- Role yang valid hanya `ADMIN` dan `CASHIER`.
- Route Admin memakai middleware/policy Admin.
- Kasir tidak boleh melakukan operasi sensitif meskipun mencoba memanggil API langsung.
- Frontend route guard hanya untuk UX, bukan security boundary.

---

## 11. Error Handling

API menggunakan format error konsisten, misalnya:

```json
{
  "message": "Stock is insufficient",
  "code": "INSUFFICIENT_STOCK",
  "errors": {
    "product_id": ["Requested quantity exceeds current stock."]
  }
}
```

Kategori error minimum:

- validation error,
- unauthorized,
- forbidden,
- not found,
- conflict/business rule,
- server error.

Frontend menerjemahkan error teknis menjadi pesan yang dapat dipahami Kasir/Admin.

---

## 12. Reporting Strategy

Dashboard dan laporan membaca langsung dari transactional database pada MVP. Materialized view, data warehouse, atau analytics service belum diperlukan.

Jika volume data meningkat signifikan di masa depan, optimasi dapat dilakukan melalui:

- index tambahan,
- summary table,
- scheduled aggregation,
- read replica.

Namun optimasi tersebut tidak dilakukan sebelum ada bukti bottleneck.

---

## 13. Testing Strategy

### Unit Test

- perhitungan subtotal/total,
- estimated operating result,
- role rules,
- stock quantity calculation helper.

### Feature/Integration Test

Paling penting:

1. Kasir dapat checkout transaksi valid.
2. Checkout mengurangi stok tepat sekali.
3. Checkout gagal jika stok kurang.
4. Checkout rollback jika operasi database gagal.
5. Kasir tidak dapat void PAID sale.
6. Admin dapat void PAID sale.
7. Void mengembalikan stok tepat sekali.
8. Harga historis tidak berubah setelah master price diubah.
9. Report total sama dengan sumber transaksi pada periode yang sama.
10. Endpoint Admin menghasilkan 403 untuk Kasir.

---

## 14. Technical Decisions yang Dikunci untuk MVP

1. **Monolith backend, bukan microservice.** Domain dan skala awal belum memerlukan kompleksitas microservice.
2. **REST API.** Lebih sederhana untuk kebutuhan CRUD, POS, dashboard, dan report saat ini.
3. **Relational database.** Integritas transaksi dan stok memerlukan foreign key dan database transaction.
4. **No mechanic account.** Sesuai kebutuhan bisnis; mekanik hanya master data.
5. **Income derived from paid sales.** Menghindari duplikasi data keuangan.
6. **Snapshot transaction values.** Menjaga histori tetap benar.
7. **Immutable paid transaction for Cashier.** Mengurangi manipulasi dan kesalahan setelah pembayaran.
8. **Admin-only void.** Menjaga kontrol pemilik terhadap koreksi transaksi final.
9. **Stock movement ledger.** Setiap perubahan stok harus dapat diaudit.
10. **No premature microservices/caching.** Optimasi baru dilakukan berdasarkan kebutuhan nyata.
