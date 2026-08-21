# Schema.md

## 1. Database Principles

Database menggunakan relational schema dengan fokus pada integritas transaksi, stok, servis, dan audit.

Prinsip utama:

1. Semua primary key menggunakan `BIGINT UNSIGNED` auto increment atau strategi ID konsisten yang dipilih proyek. Dokumen ini menggunakan `BIGINT UNSIGNED` sebagai baseline.
2. Semua nilai uang menggunakan `DECIMAL`, bukan FLOAT/DOUBLE.
3. Quantity dan stok menggunakan `INTEGER` (seluruh kolom jumlah tidak boleh fraksional).
4. Foreign key digunakan untuk relasi utama.
5. Transaksi PAID/VOID dan stock movement tidak di-hard-delete melalui alur normal.
6. Harga transaksi disimpan sebagai snapshot.
7. Pemasukan berasal dari `sales`, bukan tabel pemasukan manual terpisah.
8. Mekanik disimpan di `mechanics`, bukan `users`.
9. Timestamp menggunakan pola konsisten `created_at`, `updated_at` bila relevan.

---

## 2. Entity Relationship Overview

```text
users
  |1
  |----< sales
  |----< service_orders
  |----< expenses
  |----< stock_movements
  |----< audit_logs

customers
  |1
  |----< sales
  |----< service_orders

mechanics
  |1
  |----< service_orders

service_orders
  |1
  |----0..1 sales

sales
  |1
  |----< sale_items
  |----< stock_movements

products
  |1
  |----< sale_items
  |----< stock_movements

services
  |1
  |----< sale_items
```

---

## 3. `users`

Menyimpan akun aplikasi. Hanya Admin dan Kasir.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| name | VARCHAR(120) | NO | |
| username | VARCHAR(80) | NO | UNIQUE |
| email | VARCHAR(190) | NO | UNIQUE — kredensial login |
| password | VARCHAR(255) | NO | hashed |
| role | ENUM('ADMIN','CASHIER') | NO | |
| is_active | BOOLEAN | NO | default TRUE |
| remember_token | VARCHAR(100) | YES | Laravel remember-me token |
| last_login_at | DATETIME | YES | |
| created_at | TIMESTAMP | YES | framework timestamp |
| updated_at | TIMESTAMP | YES | framework timestamp |

Indexes:

- UNIQUE `username`
- UNIQUE `email`
- INDEX `role, is_active`

Business rule:

- Tidak ada role MECHANIC.
- Login menggunakan `email` + `password` (bukan `username`). `username` tetap disimpan sebagai identitas tampilan/manajemen pengguna, tetapi bukan kredensial autentikasi.
- Sesi berlaku 720 menit (12 jam) via `SESSION_LIFETIME`.
- Login dibatasi 20 percobaan per menit per IP (`throttle:login`); endpoint API umum 300/menit per user/IP (`throttle:api`); endpoint berat (dashboard/report/export) 120/menit (`throttle:heavy`). Jika terlampaui, API mengembalikan 429 dengan pesan ramah + header `Retry-After`, dan frontend menampilkan pesan yang mudah dipahami.
- Opsi "Ingat saya" (remember me) memicu `remember_token` untuk sesi persisten; tanpa opsi ini token tidak dibuat. Logout meng-rotate token (perilaku default Laravel).

---

## 4. `mechanics`

Master data mekanik tanpa akun login.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| name | VARCHAR(120) | NO | |
| phone | VARCHAR(30) | YES | |
| is_active | BOOLEAN | NO | default TRUE |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Index:

- INDEX `name`
- INDEX `is_active`

---

## 5. `customers`

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| name | VARCHAR(120) | NO | |
| phone | VARCHAR(30) | YES | indexed for search |
| motorcycle_type | VARCHAR(100) | YES | motor default/terakhir pelanggan (auto-fill saat order baru); tidak mengunci motor per order |
| notes | TEXT | YES | optional |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Indexes:

- INDEX `name`
- INDEX `phone`

Phone tidak harus UNIQUE karena satu nomor dapat digunakan oleh anggota keluarga atau data pelanggan dapat tidak lengkap.

---

## 6. `products`

Master sparepart/barang yang memiliki stok.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| sku | VARCHAR(80) | NO | UNIQUE |
| name | VARCHAR(160) | NO | |
| category | VARCHAR(100) | YES | |
| brand | VARCHAR(100) | YES | |
| unit | VARCHAR(30) | NO | example: pcs, bottle, set |
| purchase_price | DECIMAL(15,2) | NO | >= 0 |
| sale_price | DECIMAL(15,2) | NO | >= 0 |
| current_stock | INTEGER | NO | default 0, >= 0 |
| min_stock | INTEGER | NO | default 0, >= 0 |
| is_active | BOOLEAN | NO | default TRUE |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- UNIQUE `sku`
- CHECK `purchase_price >= 0`
- CHECK `sale_price >= 0`
- CHECK `current_stock >= 0`
- CHECK `min_stock >= 0`

Indexes:

- INDEX `name`
- INDEX `category`
- INDEX `brand`
- INDEX `is_active`

Low stock diturunkan dari `current_stock <= min_stock`.

---

## 7. `services`

Master jasa servis yang tidak memiliki stok.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| code | VARCHAR(80) | NO | UNIQUE |
| name | VARCHAR(160) | NO | |
| sale_price | DECIMAL(15,2) | NO | >= 0 |
| is_active | BOOLEAN | NO | default TRUE |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- UNIQUE `code`
- CHECK `sale_price >= 0`

---

## 8. `service_orders`

Menyimpan pekerjaan servis, bukan transaksi keuangan. Fitur kendaraan (`vehicles`) telah dihapus — order cukup mencatat pelanggan, tipe motor, keluhan, dan catatan diagnosa. `motorcycle_type` di sini adalah **motor per order**: terisi otomatis dari `customers.motorcycle_type` saat kasir membuat order untuk pelanggan terdaftar, namun tetap bisa diedit tanpa mengubah master pelanggan (pelanggan bisa punya 2 kendaraan).

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| order_code | VARCHAR(40) | NO | UNIQUE |
| customer_id | BIGINT UNSIGNED | NO | FK -> customers.id |
| motorcycle_type | VARCHAR(100) | YES | motor untuk order ini; diisi dari master saat match telepon, editable |
| cashier_id | BIGINT UNSIGNED | NO | FK -> users.id |
| mechanic_id | BIGINT UNSIGNED | YES | FK -> mechanics.id, SET NULL (dormant — kolom tersimpan, UI di-nonaktifkan) |
| complaint | TEXT | NO | |
| diagnosis_note | TEXT | YES | |
| status | ENUM('OPEN','IN_PROGRESS','DONE','CANCELLED') | NO | default OPEN; UI hanya memakai OPEN ("Baru") & DONE ("Selesai"); IN_PROGRESS/CANCELLED dormant |
| opened_at | DATETIME | NO | |
| completed_at | DATETIME | YES | di-set otomatis saat checkout dibayar (DONE) |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- FK customer, cashier, mechanic.
- `cashier_id` mengarah ke users, tetapi backend harus memastikan role user tersebut valid untuk aksi yang dilakukan.
- Status DONE ("Selesai") dicapai **otomatis** oleh `CheckoutSaleService` saat sale yang ditautkan dibayar (order "Baru" → "Selesai" + `completed_at`). Update endpoint menolak DONE manual (`in:OPEN,IN_PROGRESS,CANCELLED`). Status terminal (DONE/CANCELLED) tidak pernah ditimpa oleh checkout (guard `in_array(...)`). IN_PROGRESS/CANCELLED dormant (dipakai hanya untuk data lama).
- **Hapus (DELETE `/service-orders/{id}`)**: diizinkan untuk semua status. Jika order memiliki sale, sale tetap tersimpan dan kaitannya dikosongkan (`sales.service_order_id` → null) sehingga nota/transaksi tidak ter-orphan. Dicatat ke audit log `SERVICE_ORDER_DELETED` dengan flag `sale_unlinked`.

Indexes:

- UNIQUE `order_code`
- INDEX `status, opened_at`
- INDEX `mechanic_id, opened_at`
- INDEX `cashier_id, opened_at`

---

## 9. `sales`

Header transaksi POS.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| sale_code | VARCHAR(40) | NO | UNIQUE |
| cashier_id | BIGINT UNSIGNED | NO | FK -> users.id |
| customer_id | BIGINT UNSIGNED | YES | FK -> customers.id, SET NULL |
| service_order_id | BIGINT UNSIGNED | YES | FK -> service_orders.id, UNIQUE nullable |
| status | VARCHAR(20) | NO | default DRAFT; values: DRAFT, PENDING, PAID, EXPIRED, VOID |
| subtotal | DECIMAL(15,2) | NO | default 0 |
| discount_amount | DECIMAL(15,2) | NO | default 0 |
| grand_total | DECIMAL(15,2) | NO | default 0 |
| payment_method | VARCHAR(20) | YES | CASH, QRIS, VA, GOPAY; required when PAID |
| paid_amount | DECIMAL(15,2) | YES | |
| change_amount | DECIMAL(15,2) | YES | |
| paid_at | DATETIME | YES | |
| voided_at | DATETIME | YES | |
| voided_by | BIGINT UNSIGNED | YES | FK -> users.id |
| void_reason | VARCHAR(500) | YES | required when VOID |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- UNIQUE `sale_code`
- UNIQUE nullable `service_order_id` agar satu order servis memiliki maksimal satu transaksi final.
- CHECK monetary values >= 0.
- Application rule: `payment_method`, `paid_at` required when PAID.
- Application rule: `voided_by`, `void_reason`, `voided_at` required when VOID.

Indexes:

- INDEX `status, paid_at`
- INDEX `cashier_id, paid_at`
- INDEX `customer_id`

Hard delete tidak tersedia pada transaksi PAID/VOID.

---

## 10. `sale_items`

Menyimpan item produk atau jasa pada transaksi dengan snapshot historis.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| sale_id | BIGINT UNSIGNED | NO | FK -> sales.id, CASCADE untuk DRAFT lifecycle |
| item_type | ENUM('PRODUCT','SERVICE') | NO | |
| product_id | BIGINT UNSIGNED | YES | FK -> products.id, RESTRICT/SET NULL sesuai migration policy |
| service_id | BIGINT UNSIGNED | YES | FK -> services.id |
| item_code_snapshot | VARCHAR(80) | YES | |
| item_name_snapshot | VARCHAR(160) | NO | |
| quantity | INTEGER | NO | > 0 |
| unit_price | DECIMAL(15,2) | NO | >= 0 |
| purchase_price_snapshot | DECIMAL(15,2) | YES | produk only |
| subtotal | DECIMAL(15,2) | NO | >= 0 |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- FK `sale_id`.
- Exactly one of `product_id` or `service_id` harus terisi sesuai `item_type`.
- CHECK `quantity > 0`.
- CHECK `unit_price >= 0`.
- CHECK `subtotal >= 0`.

Business rule:

- Untuk PRODUCT, `purchase_price_snapshot` wajib diisi pada checkout.
- Untuk SERVICE, `purchase_price_snapshot` NULL.
- Snapshot digunakan untuk laporan dan nota historis.

---

## 11. `stock_movements`

Ledger perubahan stok.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| product_id | BIGINT UNSIGNED | NO | FK -> products.id |
| type | ENUM('OPENING','PURCHASE','SALE','SALE_REVERSAL','ADJUSTMENT','VOID_RETURN') | NO | |
| quantity_change | INTEGER | NO | signed value, not zero |
| stock_before | INTEGER | NO | >= 0 |
| stock_after | INTEGER | NO | >= 0 |
| sale_id | BIGINT UNSIGNED | YES | FK -> sales.id |
| created_by | BIGINT UNSIGNED | NO | FK -> users.id |
| note | VARCHAR(500) | YES | required for manual adjustment |
| created_at | TIMESTAMP | YES | immutable record |

Constraints:

- CHECK `quantity_change <> 0`.
- CHECK `stock_before >= 0`.
- CHECK `stock_after >= 0`.
- For SALE and VOID_RETURN, `sale_id` must reference related sale.
- Manual ADJUSTMENT requires note in application validation.

Indexes:

- INDEX `product_id, created_at`
- INDEX `type, created_at`
- INDEX `sale_id`

No `updated_at` is required if movement records are treated as immutable.

---

## 11b. `payment_charges`

Menyimpan data gateway pembayaran online (QRIS, Virtual Account, GoPay). Relasi 1:N dengan `sales` (MVP = 1 charge/sale).

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| sale_id | BIGINT UNSIGNED | NO | FK -> sales.id, CASCADE |
| method | VARCHAR(20) | NO | QRIS, VA, GOPAY |
| amount | DECIMAL(15,2) | NO | >= 0 |
| status | VARCHAR(20) | NO | default PENDING; values: PENDING, PAID, EXPIRED, FAILED |
| gateway_transaction_id | VARCHAR(100) | YES | UNIQUE — id transaksi dari gateway |
| gateway_type | VARCHAR(20) | YES | qris, bank_transfer, gopay |
| va_number | VARCHAR(50) | YES | nomor VA (untuk metode VA) |
| qr_url | TEXT | YES | URL QR code image |
| qr_string | TEXT | YES | string data QR (untuk render lokal) |
| deeplink | TEXT | YES | deep link untuk GoPay |
| expires_at | DATETIME | YES | waktu kedaluwarsa tagihan |
| paid_at | DATETIME | YES | waktu pembayaran diterima |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- FK `sale_id` -> `sales.id` CASCADE (hapus sale = hapus charge).
- UNIQUE `gateway_transaction_id` (mencegah referensi duplikat dari webhook).
- CHECK `amount >= 0`.

Indexes:

- INDEX `sale_id`
- INDEX `status, expires_at` (untuk auto-expire scheduler)

Business rule:

- Raw webhook payload disimpan di `audit_log.after_data` (bukan di tabel ini) untuk reconciliasi/forensik tanpa menyimpan data sensitif di tempat transaksi.
- `gross_amount` webhook dicocokkan ke `charge.amount`, bukan sekadar `grand_total` sale.

---

## 12. `expenses`

| Column | Type | Null | Constraint / Notes |
|---|---:|---|---:|
| id | BIGINT UNSIGNED | NO | PK |
| expense_date | DATE | NO | |
| category | VARCHAR(100) | NO | |
| amount | DECIMAL(15,2) | NO | > 0 |
| description | VARCHAR(500) | YES | |
| created_by | BIGINT UNSIGNED | NO | FK -> users.id |
| stock_movement_id | BIGINT UNSIGNED | YES | FK -> stock_movements.id, SET NULL; diisi untuk expense otomatis dari restock |
| source | VARCHAR(20) | YES | NULL = MANUAL; `STOCK_PURCHASE` = otomatis dari restock berbayar |
| item_name | VARCHAR(160) | YES | nama barang (restock) |
| quantity | INTEGER | YES | jumlah barang (restock) |
| unit_price | DECIMAL(15,2) | YES | harga beli per unit (restock) |
| payment_method | VARCHAR(20) | YES | dicadangkan (tidak diisi dari Atur Stok) |
| created_at | TIMESTAMP | YES | |
| updated_at | TIMESTAMP | YES | |

Constraints:

- CHECK `amount > 0`.
- Expense `source = 'STOCK_PURCHASE'` dibuat otomatis oleh `AdjustStockService` dalam satu transaksi DB dengan perubahan stok (Rules.md §9); **tidak dapat diedit manual** (ExpenseController::update → 403 `EXPENSE_LOCKED`). Koreksi melalui Atur Stok baru.

Indexes:

- INDEX `expense_date`
- INDEX `category, expense_date`
- INDEX `stock_movement_id`
- INDEX `source`

Pemasukan tidak memiliki tabel counterpart karena dihitung dari `sales` PAID.

---

## 13. `audit_logs`

Audit terhadap aktivitas sensitif.

| Column | Type | Null | Constraint / Notes |
|---|---|---:|---|
| id | BIGINT UNSIGNED | NO | PK |
| user_id | BIGINT UNSIGNED | YES | FK -> users.id, SET NULL |
| action | VARCHAR(80) | NO | e.g. SALE_VOIDED |
| entity_type | VARCHAR(80) | NO | e.g. sale, product |
| entity_id | BIGINT UNSIGNED | YES | generic reference |
| before_data | JSON | YES | sanitized snapshot |
| after_data | JSON | YES | sanitized snapshot |
| reason | VARCHAR(500) | YES | |
| ip_address | VARCHAR(45) | YES | IPv4/IPv6 |
| user_agent | VARCHAR(500) | YES | optional |
| created_at | TIMESTAMP | YES | immutable |

Indexes:

- INDEX `user_id, created_at`
- INDEX `entity_type, entity_id`
- INDEX `action, created_at`

Sensitive fields seperti password/hash tidak boleh disimpan pada before/after JSON.

---

## 14. Optional Reference Tables

Untuk MVP, beberapa field seperti category dan payment method dapat berupa enum/string agar implementasi lebih sederhana. Jika kebutuhan konfigurasi bertambah, dapat diekstrak menjadi tabel master seperti:

- `product_categories`
- `expense_categories`
- `payment_methods`

Perubahan ini tidak diperlukan sebelum ada kebutuhan bisnis nyata.

---

## 15. Key Constraints dan Invariants

### Sales

- `grand_total = subtotal - discount_amount` pada backend.
- `discount_amount <= subtotal`.
- PAID sale tidak dapat kembali ke DRAFT.
- VOID hanya berasal dari PAID.
- Kasir tidak boleh VOID PAID sale.

### Inventory

- `products.current_stock` tidak boleh negatif.
- Setiap perubahan current_stock harus memiliki stock movement pada transaction database yang sama.
- Sale PRODUCT PAID menghasilkan movement SALE.
- Sale VOID menghasilkan movement VOID_RETURN tepat satu kali untuk setiap movement SALE terkait.

### Service Order

- `customer_id` wajib agar riwayat servis dapat ditelusuri.
- `mechanic_id` boleh NULL jika belum ditentukan.
- Service order bukan sumber pemasukan.

### Users

- role hanya ADMIN atau CASHIER.
- user nonaktif tidak dapat login.

---

## 16. Derived Metrics

### Revenue

```text
SUM(sales.grand_total)
WHERE sales.status = 'PAID'
AND paid_at in selected period
```

Karena sale yang sudah VOID berstatus `VOID`, transaksi tersebut tidak termasuk revenue aktif.

### Product COGS

```text
SUM(sale_items.purchase_price_snapshot * sale_items.quantity)
JOIN sales
WHERE sales.status = 'PAID'
AND sale_items.item_type = 'PRODUCT'
AND paid_at in selected period
```

### Recorded Expenses

```text
SUM(expenses.amount)
WHERE expense_date in selected period
```

### Estimated Operating Result

```text
Revenue - Product COGS - Recorded Expenses
```

Formula ini harus sama pada dashboard dan report.

### Low Stock

```text
products.current_stock <= products.min_stock
AND products.is_active = TRUE
```

---

## 17. Deletion Policy

- `users`: deactivate, bukan delete jika sudah memiliki histori transaksi.
- `mechanics`: deactivate jika sudah dipakai order servis.
- `products`: deactivate jika sudah pernah terjual.
- `services`: deactivate jika sudah pernah terjual.
- `customers`: hindari delete jika sudah memiliki histori; gunakan archive policy bila dibutuhkan.
- `sales PAID/VOID`: never hard delete through application.
- `stock_movements`: immutable, never delete through application.
- `audit_logs`: immutable, never edit/delete through normal application.

---

## 18. Migration Order

Urutan migration yang aman:

1. users
2. mechanics
3. customers
4. products
5. services
6. service_orders
7. sales
8. sale_items
9. stock_movements
10. expenses
11. audit_logs

Migration `2026_08_18_100012_drop_vehicles` menghapus tabel `vehicles` beserta kolom FK-nya (`sales.vehicle_id`, `service_orders.vehicle_id`) dan `service_orders.odometer`. Migration `2026_08_18_100013_make_stock_quantities_integer` mengubah kolom stok/quantity menjadi `INTEGER` (`products.current_stock/min_stock`, `stock_movements.quantity_change/stock_before/stock_after`, `sale_items.quantity`). Migration `2026_08_19_100014_add_purchase_link_to_expenses` menambah kolom relasi pembelian pada `expenses` (`stock_movement_id`, `source`, `item_name`, `quantity`, `unit_price`, `payment_method`). Migration `2026_08_19_100015_add_motorcycle_type_fields` menambah `motorcycle_type` (VARCHAR(100) nullable) pada `customers` (motor default) dan `service_orders` (motor per order). Migration sumber lama (`2026_08_09_100002_create_vehicles_table` dst.) dibiarkan sebagai riwayat.

Jika terdapat circular dependency pada `sales.service_order_id` atau constraint tertentu, migration dapat dibuat dalam dua langkah: create table terlebih dahulu, lalu add foreign key setelah kedua tabel tersedia.
