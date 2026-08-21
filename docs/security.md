# Security.md — Security Hardening, QA Testing & Deploy Readiness

## 1. Identitas Dokumen

**Sistem:** Bengkel POS & Monitoring  
**Target rilis:** MVP / v1.0.0  
**Posisi dokumen:** Dokumen penutup setelah `PRD.md`, `Architecture.md`, `Design.md`, `Schema.md`, dan `Rules.md`  
**Tujuan:** Menjadi security gate, QA gate, dan deploy-readiness checklist sebelum sistem digunakan sebagai sumber pencatatan utama bengkel.

Dokumen ini **tidak menambahkan fitur bisnis baru**. Fungsinya adalah mengaudit dan menguji implementasi dari requirement yang sudah ditetapkan pada lima dokumen utama proyek.

Dokumen ini harus dibaca bersama:

1. `PRD.md` — kebutuhan bisnis dan scope MVP.
2. `Architecture.md` — stack, boundary API, data flow, dan keputusan teknis.
3. `Design.md` — UI/UX, role visibility, dan perilaku layar.
4. `Schema.md` — tabel, relasi, constraint, dan invariants.
5. `Rules.md` — coding convention, domain guardrails, dan aturan kontribusi.

Jika security hardening membutuhkan perubahan business flow, schema, API, atau UI, perubahan tersebut **tidak boleh dilakukan diam-diam hanya di `Security.md`**. Dokumen terkait harus diperbarui agar seluruh dokumentasi tetap konsisten.

---

## 2. Prinsip Dasar Security Proyek

Security untuk Bengkel POS & Monitoring berfokus pada aset yang paling berisiko bagi bisnis bengkel:

1. **Uang dan transaksi** — nilai transaksi tidak boleh dapat dimanipulasi dari frontend.
2. **Stok sparepart** — stok tidak boleh menjadi negatif, berubah tanpa jejak, atau tidak sinkron dengan transaksi.
3. **Hak akses** — Kasir tidak boleh mendapatkan kemampuan Admin dengan memanggil API secara langsung.
4. **Data pelanggan** — nama, nomor telepon, dan riwayat servis tidak boleh bocor ke pihak yang tidak berwenang.
5. **Riwayat bisnis** — transaksi PAID/VOID, stock movement, dan audit log tidak boleh dihapus atau diubah diam-diam.
6. **Akun pengguna** — credential harus dilindungi dan akun nonaktif tidak boleh digunakan untuk login.
7. **Laporan pemilik** — harga beli, estimasi hasil usaha, pengeluaran, dan laporan penuh hanya tersedia untuk Admin.

Security boundary utama berada di **backend Laravel**. Menyembunyikan tombol/menu di React hanya membantu UX dan **tidak dianggap sebagai kontrol keamanan**.

---

## 3. Scope Security yang Dikunci

### 3.1 Role aplikasi

Role aplikasi hanya:

- `ADMIN`
- `CASHIER`

Tidak ada role `MECHANIC`. Mekanik hanya merupakan master data pada tabel `mechanics` dan tidak memiliki akun login.

### 3.2 Komponen sistem

Security checklist ini berlaku untuk:

- React + TypeScript + Vite + Tailwind CSS frontend.
- Laravel REST API backend.
- MySQL database.
- API JSON dengan prefix yang direkomendasikan `/api/v1`.
- Dashboard Admin.
- POS/Sales.
- Service Orders.
- Products & Inventory.
- Service catalog.
- Customers.
- Mechanics master.
- Expenses.
- Reports & export.
- User management.
- Audit logs.
- Payment gateway (Midtrans QRIS/VA/GoPay).
- Webhook endpoint.

### 3.3 Tidak termasuk MVP / Not Applicable

Berdasarkan dokumen proyek saat ini, bagian berikut **bukan fitur MVP** dan tidak boleh dibuat hanya demi memenuhi security checklist:

- Penyimpanan nomor kartu/debit/kredit.
- Upload file dari pengguna.
- WebSocket/realtime channel.
- Public customer account.
- Public registration.
- Public forgot-password flow.
- Multi-cabang.
- Integrasi WhatsApp otomatis.
- Marketplace integration.

Jika salah satu fitur tersebut ditambahkan di masa depan, `PRD.md`, `Architecture.md`, `Schema.md`, `Rules.md`, dan `Security.md` harus diperbarui sebelum fitur dianggap selesai.

### 3.4 Keputusan yang belum dikunci oleh dokumen lain

Beberapa hal memang belum ditentukan pada lima dokumen awal dan **tidak boleh dihalusinasikan** sebagai fakta implementasi:

- Provider hosting/deployment final.
- Apakah autentikasi final menggunakan cookie/session Laravel atau token-based authentication.
- Domain frontend/backend production.
- Tool CI/CD yang dipakai.
- Tool error monitoring production.
- Jadwal backup final.
- RPO/RTO final.

Item-item tersebut harus diisi sesuai environment nyata saat deployment sudah dipilih.

---

## 4. Status Awal Dokumen

Dokumen ini adalah **checklist requirement**, bukan hasil penetration test.

Status default seluruh item:

`BELUM DIVERIFIKASI`

Status yang boleh digunakan saat audit:

- `PASS` — sudah diuji dan ada bukti.
- `FAIL` — diuji dan tidak memenuhi requirement.
- `BLOCKED` — belum dapat diuji karena dependency/environment belum tersedia.
- `N/A` — tidak relevan terhadap scope proyek saat ini.

Tidak boleh menulis `PASS` hanya karena implementasi terlihat benar dari UI atau karena developer merasa fitur sudah dibuat.

---

# BAGIAN A — SECURITY HARDENING

## A0. Severity Temuan

| Level | Dampak | Aturan Rilis |
|---|---|---|
| 🔴 Critical | Dapat merusak uang, stok, hak akses, credential, atau menyebabkan kebocoran serius | Block deploy |
| 🟠 High | Risiko besar terhadap keamanan/operasional | Fix sebelum go-live |
| 🟡 Medium | Risiko terbatas tetapi nyata | Fix maksimal minggu pertama setelah launch atau sebelum rilis jika mudah |
| 🟢 Low | Hardening/non-kritis | Masuk backlog terdokumentasi |

Severity dan priority tetap dibedakan. Contoh: Kasir dapat membuka laporan keuangan Admin adalah severity tinggi dan priority tinggi karena langsung melanggar role boundary.

---

## A1. Authentication & Authorization — 🔴

### Requirement autentikasi

- [ ] Password tidak pernah disimpan plaintext.
- [ ] Password menggunakan hashing bawaan Laravel yang aman (`bcrypt`/Argon2 sesuai konfigurasi framework).
- [ ] Password minimum **8 karakter**.
- [ ] Tidak ada akun production dengan password default seperti `admin123`, `password`, atau credential seeder development.
- [ ] User dengan `is_active = false` tidak dapat login.
- [ ] Response login gagal tidak membedakan secara eksplisit antara "email tidak ditemukan" dan "password salah".
- [ ] Logout harus mengakhiri session/token di backend, bukan hanya menghapus state React.
- [ ] Password/hash tidak pernah dikirim pada response API.
- [ ] Password/token tidak pernah masuk ke application log maupun `audit_logs`.

### Requirement authorization

- [ ] Backend menentukan role dari user yang terautentikasi, bukan dari field `role` yang dikirim frontend.
- [ ] Role yang sah hanya `ADMIN` dan `CASHIER`.
- [ ] Semua endpoint protected mempunyai auth middleware.
- [ ] Semua endpoint Admin mempunyai policy/gate/middleware Admin yang sesuai.
- [ ] Kasir yang memanggil endpoint Admin secara langsung harus menerima HTTP `403`.
- [ ] Frontend route guard tidak pernah menjadi satu-satunya guard.
- [ ] Field sensitif Admin tidak ikut terkirim pada response API ke Kasir.

### Mass assignment protection

Field berikut tidak boleh dapat diubah bebas melalui mass assignment:

- `users.role`
- `users.is_active`
- `products.purchase_price`
- `products.current_stock`
- `sales.status`
- `sales.grand_total`
- `sales.subtotal`
- `sales.discount_amount`
- `sales.cashier_id`
- `sales.voided_by`
- `sale_items.unit_price`
- `sale_items.purchase_price_snapshot`
- `stock_movements.stock_before`
- `stock_movements.stock_after`
- `stock_movements.quantity_change`
- `audit_logs.*`

Field sensitif hanya boleh berubah melalui domain action/service yang memang bertanggung jawab terhadap proses tersebut.

### Aturan khusus akun Kasir

Kasir tidak boleh:

- mengubah role dirinya menjadi Admin;
- mengaktifkan akun sendiri jika sudah dinonaktifkan;
- membuat/mengubah akun user;
- mengubah harga beli;
- melakukan VOID transaksi PAID;
- mengelola expense;
- membaca laporan finance/Estimasi Hasil Usaha;
- membaca audit log penuh.

---

## A2. Session / Token & CSRF — 🔴

`Architecture.md` saat ini mengizinkan mekanisme session/token resmi Laravel tetapi belum mengunci satu pilihan. Karena itu, implementasi harus memilih **satu** pendekatan dan memenuhi checklist yang relevan di bawah.

### Jika menggunakan Laravel Sanctum SPA / cookie-based session

- [ ] Frontend domain production terdaftar secara eksplisit pada stateful domains.
- [ ] CSRF protection aktif untuk request mutasi.
- [ ] Cookie session menggunakan `HttpOnly`.
- [ ] Cookie production menggunakan `Secure`.
- [ ] `SameSite` dikonfigurasi sesuai topologi domain nyata; jangan dibuat permisif tanpa alasan.
- [ ] Session ID di-regenerate setelah login.
- [ ] Logout meng-invalidasi session server-side.
- [ ] Session cookie tidak dapat dibaca JavaScript.

### Jika menggunakan token-based authentication

- [ ] Token dibuat oleh backend setelah credential valid.
- [ ] Token mempunyai mekanisme revoke/logout.
- [ ] Token lama tidak tetap aktif tanpa batas setelah credential berubah.
- [ ] Token tidak pernah dimasukkan ke URL/query string.
- [ ] Token tidak dicetak ke log.
- [ ] Penyimpanan token di browser dipilih dengan mempertimbangkan risiko XSS; hindari `localStorage` jika arsitektur memungkinkan alternatif yang lebih aman.

### Untuk kedua pendekatan

- [ ] Auth state frontend tidak dianggap authoritative.
- [ ] Expired/revoked session/token menghasilkan `401`.
- [ ] Frontend menghapus state user ketika backend menyatakan session tidak valid.

---

## A3. Input Validation, Injection & XSS — 🔴

Semua input harus divalidasi di backend melalui Form Request/validator terstruktur.

### Field kritis yang harus divalidasi

- [ ] `quantity > 0`.
- [ ] Semua nominal `>= 0` sesuai business rule.
- [ ] Expense `amount > 0`.
- [ ] Discount tidak boleh melebihi subtotal.
- [ ] Foreign key harus benar-benar ada.
- [ ] Enum hanya menerima value yang diizinkan.
- [ ] Nomor polisi dinormalisasi sebelum disimpan sesuai aturan proyek.
- [ ] Tanggal dan date range report tervalidasi.
- [ ] Catatan/reason mempunyai batas panjang.
- [ ] `void_reason` wajib saat Admin melakukan VOID.

### SQL injection

- [ ] Query menggunakan Eloquent/Query Builder/parameter binding.
- [ ] Audit `DB::raw`, `whereRaw`, `havingRaw`, `selectRaw`, dan raw SQL lain.
- [ ] Input user tidak boleh ditempel langsung ke raw SQL string.
- [ ] Parameter search pelanggan, SKU, nama produk, dan nomor transaksi diuji dengan payload injection.

### XSS

Field yang perlu diuji karena berasal dari input pengguna dan ditampilkan kembali:

- nama produk;
- nama jasa;
- nama pelanggan;
- nama mekanik;
- keluhan pelanggan;
- diagnosis/catatan servis;
- expense description;
- void reason;
- adjustment note.

Checklist:

- [ ] React tidak menggunakan `dangerouslySetInnerHTML` untuk data bisnis tanpa sanitization yang benar-benar diperlukan.
- [ ] Payload HTML/JavaScript ditampilkan sebagai teks, bukan dieksekusi.
- [ ] Stored XSS diuji pada daftar, detail, dashboard/report, receipt, PDF, dan spreadsheet jika field tersebut ikut diekspor.

### Command/path injection

- [ ] Input user tidak masuk ke `exec`, `shell_exec`, `system`, `eval`, atau command OS lain.
- [ ] Parameter export tidak digunakan langsung sebagai filesystem path.
- [ ] Nama file export dibuat server-side, bukan dipercaya mentah dari user.

---

## A4. Business Logic: Harga, Total & Diskon — 🔴

Frontend boleh menghitung preview untuk UX, tetapi **backend adalah source of truth**.

Pada checkout:

- [ ] Backend memuat harga master dari database.
- [ ] Backend menghitung ulang `subtotal`.
- [ ] Backend memvalidasi dan menghitung `discount_amount`.
- [ ] Backend menghitung `grand_total = subtotal - discount_amount`.
- [ ] Backend menyimpan snapshot harga jual.
- [ ] Untuk item PRODUCT, backend menyimpan `purchase_price_snapshot` dari master yang berlaku pada saat checkout.
- [ ] Nilai `unit_price`, `purchase_price_snapshot`, `subtotal`, dan `grand_total` yang dimanipulasi dari frontend tidak boleh menjadi nilai final transaksi.
- [ ] Kasir tidak dapat menggunakan request body untuk mengganti `cashier_id` menjadi user lain.

### Discount

Jika diskon memang diaktifkan oleh kebijakan bengkel:

- [ ] Discount tidak boleh negatif.
- [ ] Discount tidak boleh melebihi subtotal.
- [ ] Aturan siapa yang boleh memberikan diskon harus eksplisit di PRD/Rules sebelum diberlakukan.
- [ ] Jika aturan otorisasi diskon belum ditentukan, implementasi tidak boleh mengarang approval flow baru.

---

## A5. Inventory Integrity & Race Condition — 🔴

Inventory merupakan domain keamanan bisnis paling kritis setelah transaksi.

### Checkout

Checkout wajib berjalan di satu database transaction:

1. Pastikan sale masih `DRAFT`.
2. Load seluruh sale item.
3. Lock row produk yang terlibat (`lockForUpdate` atau mekanisme setara).
4. Validasi stok aktual.
5. Hitung total server-side.
6. Simpan price snapshots.
7. Ubah sale menjadi `PAID`.
8. Buat `SALE` stock movement.
9. Update `products.current_stock`.
10. Tulis audit log yang dibutuhkan.
11. Commit.

Jika satu langkah gagal, semuanya rollback.

Checklist:

- [ ] Dua checkout bersamaan terhadap unit terakhir tidak membuat stok negatif.
- [ ] `current_stock` tidak boleh diubah langsung dari endpoint edit product.
- [ ] Semua perubahan stok mempunyai `stock_movements` pada transaksi database yang sama.
- [ ] `quantity_change` tidak boleh 0.
- [ ] `stock_before` dan `stock_after` konsisten dengan perubahan.
- [ ] Kasir dapat melakukan stock adjustment (ADJUSTMENT/PURCHASE) via endpoint `adjust-stock`, namun tidak dapat mengubah Harga Beli atau master produk (create/update produk Admin-only).
- [ ] Stock adjustment (ADJUSTMENT/PURCHASE) wajib note/reason untuk semua role; tanpa note ditolak (422).
- [ ] Notifikasi stok `GET /products/low-stock` (threshold `current_stock < 5`) boleh diakses kedua role dan tidak mengirim field sensitif (`purchase_price`, snapshot).
- [ ] Input Atur Stok adalah **delta bertanda** (`quantity`), bukan nilai absolut; `quantity = 0` dan `stock_after < 0` ditolak (422).
- [ ] Restock berbayar (PURCHASE) membuat `Expense` otomatis **di transaksi DB yang sama** dengan perubahan stok; jika pembuatan expense gagal, stok & movement ikut rollback (atomicity diuji).
- [ ] `ADJUSTMENT`/`OPENING` tidak pernah membuat expense.

---

## A6. Transaction State & Idempotency — 🔴

Status Sale yang valid hanya:

- `DRAFT`
- `PAID`
- `VOID`

Invariants:

- [ ] `PAID` tidak kembali ke `DRAFT`.
- [ ] `VOID` hanya berasal dari sale yang sebelumnya `PAID`.
- [ ] Kasir tidak dapat VOID sale.
- [ ] VOID wajib alasan.
- [ ] Sale yang sudah VOID tidak dapat di-VOID ulang.
- [ ] PAID/VOID tidak dapat hard delete melalui aplikasi.
- [ ] Kasir tidak dapat mengubah item sale setelah PAID.

### Double-submit protection

- [ ] Klik tombol Bayar dua kali tidak menghasilkan dua penyelesaian transaksi.
- [ ] Dua request checkout terhadap sale ID yang sama hanya dapat menghasilkan satu transisi final.
- [ ] Refresh/retry request tidak membuat duplikasi `SALE stock_movement`.
- [ ] Void retry tidak membuat `VOID_RETURN` lebih dari sekali untuk stock movement terkait.

Idempotency dapat dicapai melalui state validation + row lock/database constraint/domain design; tidak wajib menambahkan teknologi baru jika invariants sudah menjamin hasil yang sama.

---

## A7. VOID Security — 🔴

VOID adalah tindakan sensitif karena mengubah revenue aktif dan mengembalikan stok.

Requirement:

- [ ] Hanya `ADMIN`.
- [ ] Sale saat ini harus `PAID`.
- [ ] `void_reason` wajib dan tidak boleh hanya whitespace.
- [ ] `voided_by` berasal dari authenticated Admin, bukan request body.
- [ ] `voided_at` dibuat server-side.
- [ ] VOID dan pengembalian stok berada pada database transaction yang sama.
- [ ] Setiap item PRODUCT menghasilkan `VOID_RETURN` sesuai jumlah yang sebelumnya keluar.
- [ ] Audit log menyimpan siapa, kapan, sale yang di-void, dan alasan.
- [ ] Sale tetap berada di database.
- [ ] VOID sale tidak dihitung sebagai revenue aktif.

---

## A8. Expenses & Financial Data — 🔴

Expense hanya dikelola Admin.

Checklist:

- [ ] Kasir tidak dapat GET/POST/PUT endpoint expense jika endpoint tersebut mengandung data finansial Admin.
- [ ] `amount` harus lebih besar dari 0.
- [ ] `created_by` berasal dari authenticated user.
- [ ] Perubahan expense sensitif tercatat audit log.
- [ ] Expense tidak dapat dimanipulasi untuk menjadi nominal negatif.
- [ ] Dashboard/report menggunakan data expense dari database dan tidak mempercayai nilai hasil perhitungan dari frontend.
- [ ] Expense `source = 'STOCK_PURCHASE'` (otomatis dari restock) tidak dapat diubah lewat PUT expense (403 `EXPENSE_LOCKED`); koreksi melalui Atur Stok baru.
- [ ] Expense restock dibuat atomically dengan perubahan stok (transaksi DB sama) dan ter-link ke `stock_movements.id`; tidak ada double entry manual.

### Estimasi Hasil Usaha

Formula yang wajib sama pada dashboard dan report:

```text
Penjualan PAID
- COGS produk dari purchase_price_snapshot
- Pengeluaran tercatat
= Estimasi Hasil Usaha
```

Security requirement:

- [ ] Kasir tidak memperoleh nilai Estimasi Hasil Usaha.
- [ ] Kasir tidak memperoleh `products.purchase_price`.
- [ ] Kasir tidak memperoleh `sale_items.purchase_price_snapshot`.
- [ ] Response resource/DTO difilter, bukan hanya kolom UI disembunyikan.

---

## A9. API Data Exposure & IDOR — 🔴

Walaupun aplikasi hanya satu bengkel dan bukan multi-tenant, object ID tetap tidak boleh menjadi cara melewati rule domain atau role.

Checklist:

- [ ] Mengganti `sale_id` tidak memungkinkan Kasir melakukan VOID.
- [ ] Mengganti `product_id` pada checkout tidak memungkinkan Kasir mengubah harga jual produk.
- [ ] Kasir mengakses `adjust-stock` hanya untuk mengubah stok (bukan Harga Beli/master produk); input divalidasi (`new_stock` integer >= 0, note wajib).
- [ ] Mengganti `user_id` tidak memungkinkan Kasir mengedit akun lain.
- [ ] Mengganti resource ID pada report/audit endpoint tetap menghasilkan `403` jika role tidak berwenang.
- [ ] Kasir yang membaca product untuk POS tidak mendapatkan `purchase_price`.
- [ ] Kasir yang membaca sale tidak mendapatkan `purchase_price_snapshot` atau derived profit field.
- [ ] Endpoint tidak mengirim seluruh model hanya karena frontend saat ini tidak menampilkan field sensitif.

### Konteks khusus: harga beli untuk Atur Stok

Kasir **tetap** tidak mendapatkan `purchase_price` dari `GET /products` default (POS/catalog). Satu-satunya pengecualian: `GET /products?include_cost=1` — hanya dikirim oleh halaman **Produk & Stok** agar modal Atur Stok dapat menampilkan pratinjau total pengeluaran restock (`quantity × purchase_price`). POS tidak pernah mengirim flag ini. Diuji pada `ProductStockTest::test_cashier_sees_purchase_price_only_when_include_cost_is_requested`.

Laravel API Resource/DTO atau serializer setara harus digunakan secara konsisten untuk membatasi field response.

---

## A10. Rate Limiting & Brute Force — 🔴

Endpoint yang wajib diberi perlindungan:

### Login

- [x] Rate limit per IP — `throttle:login` = **20 percobaan/menit per IP** (`AppServiceProvider`).
- [ ] Rate limit/per-account defense jika implementasi memungkinkan.
- [x] Percobaan login gagal berulang tidak dapat dilakukan tanpa batas.
- [x] Pesan gagal tidak mempermudah enumerasi akun.

### Endpoint berat

- [x] Export PDF/spreadsheet mempunyai throttle yang wajar — `throttle:heavy` = **120/menit**.
- [x] Report dengan rentang tanggal sangat besar tidak dapat dipanggil tanpa pembatasan sama sekali.
- [x] Endpoint dashboard/report tidak boleh menjadi jalur DoS murah.

> **Implementasi rate limit (2026-08-18):** `throttle:login` 20/menit per IP; `throttle:api` (semua endpoint terproteksi umum) 300/menit per user/IP untuk memberi ruang navigasi data SPA; `throttle:heavy` 120/menit per user/IP hanya untuk `dashboard`, `reports/*`, dan `reports/{type}/export`. Saat 429 terjadi, backend mengembalikan pesan ramah berbahasa Indonesia + header `Retry-After`; frontend menampilkan pesan ramah dan sisa detik tunggu, serta memangkas request berlebih lewat throttle navigasi (200ms), debounce pencarian (200ms), dan GET cache TTL (15s).

Tidak ada requirement untuk public register atau forgot-password karena kedua fitur tersebut bukan scope MVP.

---

## A11. Audit Log & Security Logging — 🔴

Tabel `audit_logs` sudah merupakan bagian schema dan bersifat immutable melalui aplikasi normal.

Aktivitas minimal yang diaudit:

- login berhasil jika dipilih sebagai security event;
- login gagal secara aman tanpa menyimpan password;
- checkout sale;
- VOID sale;
- perubahan harga jual;
- perubahan harga beli;
- stock adjustment;
- create/update expense;
- create/update/deactivate user;
- perubahan master penting yang berdampak ke transaksi.

Audit log minimum menyimpan jika tersedia:

- `user_id`;
- `action`;
- `entity_type`;
- `entity_id`;
- sanitized `before_data`;
- sanitized `after_data`;
- `reason`;
- IP address;
- user agent;
- timestamp.

Checklist:

- [ ] Audit log tidak menyimpan password/hash.
- [ ] Audit log tidak menyimpan auth token/session secret.
- [ ] Audit log tidak dapat diedit dari UI.
- [ ] Audit log tidak dapat dihapus dari UI.
- [ ] Kasir tidak dapat membaca audit log penuh.
- [ ] Application error log dan audit log dipisahkan secara konsep.
- [ ] Log mempunyai rotasi/retensi agar disk tidak habis.

### Monitoring production

Tool monitoring belum dikunci. Sebelum production:

- [ ] Pilih mekanisme error monitoring atau alerting yang nyata.
- [ ] Error 5xx kritis dapat diketahui tanpa menunggu pelanggan melapor.
- [ ] Alert tidak mengirim payload sensitif secara berlebihan ke third party.

---

## A12. HTTPS, CORS & Security Headers — 🟠

Production wajib HTTPS.

Checklist:

- [ ] HTTP diarahkan ke HTTPS.
- [ ] `APP_DEBUG=false`.
- [ ] Stack trace tidak tampil ke client production.
- [ ] Query SQL/path server tidak bocor pada response error.
- [ ] CORS production tidak menggunakan wildcard `*` untuk origin aplikasi authenticated.
- [ ] Allowed origin hanya domain frontend yang benar-benar digunakan.
- [ ] `Strict-Transport-Security` diterapkan setelah HTTPS production stabil dan sesuai deployment.
- [ ] `Content-Security-Policy` dibuat sesuai resource frontend yang benar-benar digunakan.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] Proteksi framing (`X-Frame-Options` dan/atau CSP `frame-ancestors`).
- [ ] `Referrer-Policy` ditetapkan.
- [ ] `Permissions-Policy` membatasi fitur browser yang tidak dibutuhkan.
- [ ] Header/server banner yang membocorkan versi diminimalkan jika environment mendukung.

Endpoint/path yang harus diuji tidak dapat diakses publik:

- `/.env`
- `/.git/`
- `/storage/logs/laravel.log`
- `/phpinfo.php`
- `/_debugbar`
- `/telescope` jika package terpasang
- `/horizon` jika package terpasang

Jika package tersebut tidak dipasang, status dapat ditulis `N/A`, bukan dibuat hanya untuk diuji.

---

## A13. Secrets & Environment Configuration — 🔴

- [ ] `.env` tidak ter-commit.
- [ ] Riwayat git diperiksa, bukan hanya working tree saat ini.
- [ ] `APP_KEY` production berbeda dari development.
- [ ] Credential database production berbeda dari local/development.
- [ ] Password database tidak ditulis di source code.
- [ ] Tidak ada secret di React bundle.
- [ ] Variable dengan prefix publik Vite tidak digunakan untuk menyimpan server secret.
- [ ] Secret tidak ditulis di dokumentasi contoh yang ikut repository jika nilainya nyata.
- [ ] Log dan backup tidak mengekspos secret plaintext secara tidak perlu.
- [ ] Ada langkah rotasi credential jika terjadi kebocoran.

Contoh audit repository:

```bash
git log --all --full-history -- .env
```

Jika credential pernah ter-commit, menghapus file dari commit terbaru **tidak cukup**. Credential tersebut harus dianggap bocor dan dirotasi.

---

## A14. Data Privacy & PII — 🟠

Data pribadi yang saat ini relevan di sistem antara lain:

- nama pelanggan;
- nomor telepon pelanggan (opsional);
- riwayat servis pelanggan;
- nama/nomor telepon mekanik (opsional);
- data akun Admin/Kasir.

Prinsip:

- [ ] Jangan mengumpulkan data yang tidak dipakai oleh fungsi bengkel.
- [ ] Tidak menyimpan data kartu pembayaran.
- [ ] Endpoint pelanggan hanya dapat diakses user authenticated sesuai role proyek.
- [ ] Tidak ada endpoint publik yang membocorkan data pelanggan.
- [ ] Export yang mengandung data pelanggan hanya Admin jika export tersebut bagian laporan Admin.
- [ ] Data production tidak disalin mentah ke development/staging tanpa kebutuhan dan perlindungan yang layak.
- [ ] Jika data production digunakan untuk testing, lakukan anonimisasi.

### Penghapusan/anonimisasi

Kebijakan data harus tetap konsisten dengan histori bisnis:

- Sale PAID/VOID tidak di-hard-delete.
- Stock movement tidak dihapus.
- Audit log tidak dihapus melalui aplikasi normal.
- Customer yang sudah memiliki histori sebaiknya diarsipkan/anonimisasi sesuai kebutuhan, bukan menghapus transaksi historis.

Detail kepatuhan hukum harus diverifikasi terhadap aturan yang benar-benar berlaku saat sistem digunakan.

---

## A15. Export Security — 🟠

Project menyediakan output laporan PDF dan spreadsheet untuk Admin.

Checklist:

- [ ] Export endpoint hanya Admin.
- [ ] Date range export divalidasi.
- [ ] Export tidak menerima nama file/path arbitrer dari user.
- [ ] Data internal yang tidak seharusnya ikut export tidak dimasukkan hanya karena tersedia di query/model.
- [ ] Export finance tidak dapat diakses Kasir melalui URL langsung.
- [ ] Export mempunyai rate limit/throttle.
- [ ] Error saat export tidak membocorkan filesystem path/server stack trace.
- [ ] Data teks yang berasal dari user diperlakukan sebagai data, bukan executable content pada output.

Jika nanti implementasi export menggunakan library tertentu, vulnerability/dependency library tersebut masuk audit supply-chain A16.

---

## A16. Dependency & Supply Chain — 🟠

Backend:

- [ ] `composer.lock` ter-commit.
- [ ] `composer audit` dijalankan pada CI/release.
- [ ] Tidak ada vulnerability Critical/High terbuka pada dependency production tanpa risk acceptance terdokumentasi.

Frontend:

- [ ] `package-lock.json` atau lockfile package manager yang dipilih ter-commit.
- [ ] `npm audit`/audit sesuai package manager dijalankan.
- [ ] Tidak ada dependency frontend tidak dikenal yang hanya ditambahkan karena AI menyarankan tanpa kebutuhan.

Runtime:

- [ ] PHP version masih mendapat security support.
- [ ] Node version build masih mendapat security support.
- [ ] MySQL version production mendukung constraint/transaction yang dibutuhkan proyek.
- [ ] Package auth/encryption tidak memakai package abandoned tanpa alasan terdokumentasi.

---

## A17. Backup & Disaster Recovery — 🟠

Backup menjadi critical karena setelah go-live database menjadi sumber utama transaksi dan stok.

Requirement minimum:

- [ ] Backup database production terjadwal.
- [ ] Backup tidak hanya berada pada server yang sama dengan aplikasi/database.
- [ ] Backup dilindungi dari akses publik.
- [ ] Restore backup sudah diuji setidaknya satu kali sebelum sistem dianggap satu-satunya sumber data bisnis.
- [ ] Kegagalan backup dapat diketahui oleh penanggung jawab.
- [ ] Procedure restore tertulis.

### Target RPO/RTO

Nilai final **belum dikunci** oleh dokumen proyek. Sebelum go-live wajib ditetapkan:

- **RPO:** `[TETAPKAN maksimal data yang boleh hilang]`
- **RTO:** `[TETAPKAN target waktu pemulihan]`
- **Retensi:** `[TETAPKAN pola backup harian/mingguan]`

Jangan menuliskan angka seolah merupakan SLA resmi sebelum pemilik/developer benar-benar menyetujuinya dan hosting mampu mendukungnya.

---

## A18. Incident Response Sederhana — 🟡

Jika ditemukan insiden keamanan atau data tidak konsisten:

1. Hentikan aksi yang memperparah insiden.
2. Jangan menghapus log/bukti.
3. Catat waktu pertama masalah diketahui.
4. Identifikasi akun, transaksi, produk, dan rentang waktu terdampak.
5. Jika credential dicurigai bocor, lakukan rotasi.
6. Jika bug menyangkut checkout/stock, pertimbangkan maintenance mode pada fitur tersebut sebelum data bertambah rusak.
7. Backup kondisi database sebelum tindakan koreksi besar.
8. Buat regression test yang mereproduksi bug sebelum perbaikan jika memungkinkan.
9. Perbaiki.
10. Jalankan test dan rekonsiliasi data.
11. Dokumentasikan kronologi dan tindakan.

Kontak penanggung jawab wajib diisi sebelum production:

- Pemilik/Admin utama: `[ISI]`
- Developer/maintainer: `[ISI]`
- Provider hosting/support: `[ISI setelah hosting dipilih]`

---

## A19. Payment Gateway & Webhook — 🔴

Fitur pembayaran online via Midtrans (QRIS/VA/GoPay) ditambahkan sebagai bagian dari MVP. Security requirements khusus:

### Webhook Endpoint

- [ ] Webhook route `POST /api/v1/payments/webhook/midtrans` berada di **luar** middleware group `auth:sanctum`.
- [ ] CSRF verification di-exception untuk webhook route (`validateCsrfTokens except: ['api/v1/payments/webhook/*']`).
- [ ] Rate limiting aktif: `throttle:30,1` (30 requests per menit per IP).
- [ ] Signature verification menggunakan `hash_equals()` (timing-safe comparison) — **WAJIB**, bukan `===`.
- [ ] Signature format: SHA512 `orderId + statusCode + grossAmount + serverKey`.
- [ ] Raw webhook payload disimpan ke `audit_log.after_data` **tanpa** header signature/secret.
- [ ] Webhook memproses `settle` (PAID) dan `expire` (EXPIRED/FAILED) — idempotent.

### PaymentCharge Model

- [ ] `PaymentCharge` model menggunakan `$guarded = []` (no mass-assignable fields).
- [ ] Hanya `PaymentService` yang mengubah `status`, `paid_at`, `gateway_transaction_id`.
- [ ] `gateway_transaction_id` UNIQUE (anti duplikasi referensi charge).
- [ ] `gateway_raw_response` **TIDAK BOLEH** di-expose ke API response (`SaleResource`).
- [ ] `gross_amount` webhook dicocokkan ke `charge.amount` (bukan sekadar `grand_total`).

### Checkout & Stock

- [ ] Online checkout: stok di-reserve saat checkout, dikembalikan jika EXPIRED.
- [ ] `startOnlinePayment` berjalan dalam `DB::transaction` + `lockForUpdate` (5 retries).
- [ ] `settleFromGateway` hanya mengubah status — **tidak** mengubah stok.
- [ ] `expire` mengembalikan stok via `StockLedger::incrementForSale` (TYPE_SALE_REVERSAL).
- [ ] Idempotent: `expire` dan `settle` menolak jika status sudah final.
- [ ] Auto-expire job (`expire:pending-sales`) scan `payment_charges` WHERE `status = PENDING AND expires_at < NOW()`.
- [ ] Race condition protection: `lockForUpdate` + idempotent check sebelum stock restore.

### Data Privacy

- [ ] Raw webhook payload dari Midtrans dapat berisi PII customer (nama, telepon).
- [ ] PII disimpan di `audit_log.after_data` — akses hanya Admin.
- [ ] Server Key Midtrans **hanya** di server (`.env` + `config/services.php`); tidak pernah ke frontend.

### Configuration

- [ ] `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` di `.env` (bukan hardcoded).
- [ ] `config('services.midtrans.*')` menyimpan konfigurasi.
- [ ] Webhook lokal: gunakan ngrok atau simulator sandbox Midtrans (dashboard Midtrans).
- [ ] `order_id` Midtrans = `sale_code` (unik, `VARCHAR(40)`).

### SaleResource

- [ ] `SaleResource` memetakan charge terbaru ke field flat: `gateway_transaction_id`, `gateway_type`, `gateway_va_number`, `gateway_qr_url`, `gateway_qr_string`, `gateway_deeplink`, `payment_expires_at`.
- [ ] `gateway_raw_response` **tidak pernah** di-expose.
- [ ] Frontend menggunakan `react-qr-code` untuk render QR lokal dari `gateway_qr_string`.

### Abuse Cases (Payment-Specific)

| ID | Skenario | Cara Uji | Hasil yang Diharapkan |
|---|---|---|---|
| AC-31 | Webhook tanpa signature | POST webhook tanpa header X-Signature | 400 Invalid signature |
| AC-32 | Webhook signature salah | POST webhook dengan signature palsu | 400 Invalid signature |
| AC-33 | Webhook double settle | POST webhook settlement 2x untuk sale sama | Idempotent — kedua return ok, status tetap PAID sekali |
| AC-34 | Webhook amount mismatch | POST webhook dengan gross_amount beda dari charge.amount | 422 Amount mismatch |
| AC-35 | Webhook untuk sale bukan PENDING | POST webhook untuk sale PAID/VOID | Ditolak (status check) |
| AC-36 | Expire double | Panggil expire 2x pada sale sama | Idempotent — kedua return, status tetap EXPIRED |
| AC-37 | Cashier coba settle manual | Kasir POST ke webhook endpoint | Webhook tidak butuh auth — proses berdasarkan signature |
| AC-38 | Concurrent expire + webhook | Jalankan expire manual + webhook bersamaan | Satu berhasil; lainnya idempotent; stok restore sekali |

---

# BAGIAN B — QA & SECURITY TESTING

## B0. Prinsip Testing

Setiap bug keamanan yang ditemukan pada uang, stok, role, atau audit harus mempunyai regression test.

Urutan yang dianjurkan:

```text
Temukan bug
-> buat test yang mereproduksi bug
-> pastikan test FAIL
-> perbaiki implementasi
-> pastikan test PASS
-> simpan test ke regression suite
```

Tidak boleh memperbaiki bug kritis hanya dengan manual testing lalu membuang skenario reproduksinya.

---

## B1. Test Strategy

```text
        E2E
     Integration
       Unit
```

### Unit test

Fokus pada pure/domain logic:

- perhitungan subtotal;
- discount;
- grand total;
- COGS snapshot;
- Estimasi Hasil Usaha;
- stock movement calculation;
- status/invariant validation.

### Feature/Integration test

Fokus pada:

- route + middleware;
- policy/authorization;
- validation;
- database side effects;
- transaction rollback;
- response serialization.

### E2E

Hanya untuk alur utama yang jika rusak membuat bengkel tidak dapat bekerja dengan benar.

### Coverage target proyek

Angka coverage bukan bukti security, tetapi dapat digunakan sebagai guardrail.

Target proyek yang direkomendasikan dan harus dianggap **target internal, bukan standar eksternal**:

- business logic uang/stok/authorization kritis: target coverage tinggi dan seluruh branch penting harus diuji;
- keseluruhan codebase: coverage tidak boleh dijadikan pengganti test case kritis.

Jika tim ingin menggunakan angka persentase, tetapkan sendiri di CI dan dokumentasikan sebagai keputusan proyek.

---

## B2. Test Environment & Test Data

- [ ] Test database terpisah dari production.
- [ ] Laravel test menggunakan database test dan reset/transaction mechanism yang aman.
- [ ] Tidak pernah menjalankan automated test yang destructive pada database production.
- [ ] Factory/seeder menyediakan minimal satu Admin dan satu Cashier untuk testing.
- [ ] Test account production tidak menggunakan credential lemah.
- [ ] Test data mencakup normal, boundary, invalid, dan concurrent case.
- [ ] Staging tidak menggunakan data pelanggan production mentah jika tidak diperlukan.

Data minimum test:

- Admin aktif.
- Cashier aktif.
- Cashier nonaktif.
- Product dengan stok > 0.
- Product stok 0.
- Product stok 1 untuk concurrency test.
- Service aktif.
- Customer.
- Mechanic aktif.
- DRAFT sale.
- PAID sale.
- VOID sale.

---

## B3. Unit Test Wajib — 🔴

### Money calculation

- [ ] subtotal normal.
- [ ] multiple items.
- [ ] discount 0.
- [ ] discount valid.
- [ ] discount > subtotal ditolak.
- [ ] negative amount ditolak.
- [ ] pembulatan/DECIMAL menghasilkan hasil konsisten.

### Inventory

- [ ] SALE mengurangi stock sesuai quantity.
- [ ] VOID_RETURN mengembalikan stock sesuai quantity.
- [ ] ADJUSTMENT menghasilkan stock_before/stock_after benar.
- [ ] stok tidak cukup ditolak.
- [ ] stock_after tidak negatif.

### Report formula

- [ ] Revenue hanya sale `PAID`.
- [ ] VOID tidak ikut revenue aktif.
- [ ] COGS memakai `purchase_price_snapshot`, bukan harga beli master saat report dibuat.
- [ ] Estimated Operating Result memakai formula yang sama dengan PRD/Schema.

---

## B4. Feature / Integration Test API — 🔴

Untuk setiap endpoint penting, uji minimal:

1. Happy path.
2. Tanpa autentikasi -> `401`.
3. Role tidak berwenang -> `403`.
4. Payload invalid -> `422`.
5. Resource tidak ada -> `404`.
6. Business conflict -> `409` jika kontrak API memilih status tersebut.
7. Side effect database benar.
8. Audit log benar jika aksi termasuk audited action.
9. Field sensitif tidak bocor pada response.

Contoh khusus:

- Checkout tidak cukup hanya assert `200`; assert sale menjadi PAID, stock berkurang, SALE movement dibuat, snapshot tersimpan.
- Void tidak cukup assert `200`; assert status VOID, stock kembali tepat sekali, VOID_RETURN dibuat, audit log ada.

---

## B5. Matriks RBAC yang Diharapkan — 🔴

Matriks berikut adalah **expected authorization** berdasarkan PRD/Architecture/Rules. Endpoint final boleh memiliki nama berbeda, tetapi capability tidak boleh berubah tanpa update dokumen.

Legenda:

- ✅ = diizinkan.
- ❌ = harus ditolak backend.
- ⚠️ = boleh akses tetapi response/action harus dibatasi oleh rule tambahan.

| Capability / Endpoint Boundary | Admin | Cashier | Catatan Security |
|---|:---:|:---:|---|
| `POST /auth/login` | ✅ | ✅ | hanya akun aktif |
| `POST /auth/logout` | ✅ | ✅ | authenticated |
| `GET /auth/me` | ✅ | ✅ | jangan kirim password/hash |
| `GET /dashboard` | ✅ | ❌ | dashboard bisnis penuh Admin |
| `GET /sales` | ✅ | ⚠️ | Cashier hanya data operasional; jangan expose purchase price/profit |
| `POST /sales` | ✅ | ✅ | membuat DRAFT |
| `GET /sales/{id}` | ✅ | ⚠️ | Cashier tidak mendapat field finansial internal |
| `PUT /sales/{id}` | ✅ | ✅ | hanya DRAFT |
| `POST /sales/{id}/checkout` | ✅ | ✅ | server recalculate + stock lock |
| `POST /sales/{id}/void` | ✅ | ❌ | Admin only + reason |
| `GET /service-orders` | ✅ | ✅ | authenticated |
| `POST /service-orders` | ✅ | ✅ | customer required |
| `GET /service-orders/{id}` | ✅ | ✅ | tidak expose purchase price |
| `PUT /service-orders/{id}` | ✅ | ✅ | sesuai business rule |
| `GET /products` | ✅ | ⚠️ | Cashier boleh stok/harga jual, bukan harga beli |
| Create/update product master | ✅ | ❌ | Admin only |
| Stock adjustment endpoint | ✅ | ✅ | reason required |
| `GET /services` | ✅ | ✅ | katalog jasa |
| Create/update service master | ✅ | ❌ | Admin only |
| Customer CRUD | ✅ | ✅ | hindari hard delete jika ada history |
| `GET /mechanics` | ✅ | ✅ | untuk memilih mekanik |
| Create/update/deactivate mechanic | ✅ | ❌ | Admin only |
| Expense endpoints | ✅ | ❌ | Admin only |
| Sales report | ✅ | ❌ | Admin only |
| Service report | ✅ | ❌ | Admin only |
| Inventory report | ✅ | ❌ | Admin only |
| Finance report | ✅ | ❌ | Admin only |
| Export reports | ✅ | ❌ | Admin only |
| User management | ✅ | ❌ | Admin manages Cashier |
| `GET /audit-logs` | ✅ | ❌ | Admin only |

Automated test harus gagal jika route/capability baru ditambahkan tanpa authorization rule yang jelas.

---

## B6. Required E2E Critical Flows — 🟠

### E2E-01 — Cashier normal POS sale

```text
Login Cashier
-> buat DRAFT sale
-> tambah PRODUCT
-> checkout
-> receipt tampil
-> sale = PAID
-> stock berkurang
```

Expected:

- transaksi hanya terjadi sekali;
- stock movement SALE ada;
- harga snapshot tersimpan;
- Kasir tidak melihat purchase price.

### E2E-02 — Service order sampai pembayaran

```text
Login Cashier
-> cari/buat customer
-> buat service order
-> pilih mechanic
-> update proses servis
-> buat/link POS sale
-> tambah jasa + sparepart
-> checkout
```

Expected:

- service order bukan sumber revenue kedua;
- revenue hanya dari sale PAID;
- stock sparepart berkurang satu kali.

### E2E-03 — Admin VOID

```text
Login Admin
-> buka PAID sale
-> VOID + reason
-> konfirmasi
```

Expected:

- sale = VOID;
- stok kembali;
- VOID_RETURN tercatat;
- audit log tercatat;
- transaksi tidak terhapus.

### E2E-04 — Role boundary

```text
Login Cashier
-> coba akses Dashboard Admin/Finance Report/Audit Log/Stock Adjustment
```

Expected:

- menu sensitif tidak muncul;
- request API langsung tetap `403`.

### E2E-05 — Logout

```text
Login
-> logout
-> akses kembali protected route/API
```

Expected:

- session/token tidak lagi valid;
- user harus login ulang.

---

## B7. Abuse Cases Khusus Bengkel POS — 🔴

Format status saat dieksekusi: `PASS / FAIL / BLOCKED`.

| ID | Skenario | Cara Uji | Hasil yang Diharapkan |
|---|---|---|---|
| AC-01 | Kasir mencoba jadi Admin | kirim field `role=ADMIN` pada request yang dapat dimanipulasi atau panggil user-management API | 403/field tidak dapat mengubah role |
| AC-02 | Kasir membuka dashboard bisnis | GET `/dashboard` langsung | 403 |
| AC-03 | Kasir membaca harga beli | GET product/sale endpoint dan inspeksi JSON | `purchase_price`/`purchase_price_snapshot` tidak ada |
| AC-04 | Manipulasi harga jual checkout | ubah `unit_price` menjadi 1 di payload | backend memakai harga/snapshot yang sah sesuai aturan sistem |
| AC-05 | Manipulasi grand total | kirim `grand_total=1` | backend hitung ulang |
| AC-06 | Qty negatif | kirim `quantity=-10` | 422, stok tidak bertambah |
| AC-07 | Qty nol | kirim `quantity=0` | 422 |
| AC-08 | Stok terakhir dijual bersamaan | kirim dua checkout concurrent pada stok 1 | satu berhasil; lainnya ditolak; stok >= 0 |
| AC-09 | Double click bayar | kirim checkout sale sama dua kali | hanya satu PAID transition dan satu set SALE movement |
| AC-10 | Kasir VOID sale | POST void dengan Cashier | 403 |
| AC-11 | VOID tanpa alasan | Admin submit blank reason | 422 |
| AC-12 | VOID dua kali | POST void pada sale yang sudah VOID | ditolak; stok tidak bertambah dua kali |
| AC-13 | Edit PAID sale | PUT item/qty pada sale PAID | ditolak |
| AC-14 | Hard delete history | coba delete PAID/VOID sale/stock movement/audit log | endpoint tidak tersedia atau ditolak |
| AC-15 | Ubah current_stock lewat update product | masukkan `current_stock` ke payload edit master | field tidak mengubah stok; adjustment harus jalur khusus |
| AC-16 | Cashier membuat expense | POST expense sebagai Cashier | 403 |
| AC-17 | Stored XSS | simpan `<img src=x onerror=alert(1)>` pada nama/catatan | tampil sebagai text/ter-escape; tidak execute |
| AC-18 | SQL injection search | `' OR 1=1--` pada search | tidak bocor data/tidak 500 |
| AC-19 | Brute-force login | percobaan password salah berulang | rate limit aktif |
| AC-20 | Account enumeration | bandingkan login email invalid vs password invalid | pesan tidak mengungkap existence secara eksplisit |
| AC-21 | Login user nonaktif | login menggunakan Cashier `is_active=false` | ditolak |
| AC-22 | Access config | buka `/.env`, `/.git/config`, log path | 403/404 |
| AC-23 | Error leakage | kirim input yang memicu exception | response generik tanpa stack trace/query/path |
| AC-24 | Bypass UI | panggil Admin API dari Postman/browser menggunakan Cashier auth | 403 |
| AC-25 | Manipulasi cashier_id | kirim `cashier_id` milik user lain saat checkout | backend menggunakan authenticated actor sesuai rule |
| AC-26 | Manipulasi voided_by | kirim ID user lain pada void | backend menggunakan authenticated Admin |
| AC-27 | Revenue dari VOID masih dihitung | buat sale PAID lalu VOID, buka report | VOID tidak masuk revenue aktif |
| AC-28 | Master price berubah mengubah histori | ubah harga beli/jual setelah sale PAID, buka report lama | snapshot transaksi tetap sama |
| AC-29 | Kasir membuka finance export | panggil export URL langsung | 403 |
| AC-30 | Export abuse | spam export/report berat | throttle/rate limit bekerja |

Setiap abuse case yang gagal menjadi bug security dan minimal memiliki regression test bila dapat diotomatiskan.

---

## B8. Security Scanning — 🟠

Scanning hanya dilakukan terhadap environment milik sendiri/staging yang berizin.

Checklist:

- [ ] Dependency audit backend.
- [ ] Dependency audit frontend.
- [ ] Baseline web security scan terhadap staging jika tool tersedia.
- [ ] Security header diperiksa pada staging dan production.
- [ ] Temuan scanner dibaca manual; false positive harus diberi alasan, bukan diabaikan tanpa catatan.

Tool tidak dikunci oleh dokumen ini. OWASP ZAP dapat digunakan jika sesuai environment, tetapi hasil scanner **tidak menggantikan** abuse-case business logic.

---

## B9. Performance & Load Smoke Test — 🟡

Tujuan bukan stress test besar, melainkan memastikan sistem bengkel tidak gagal pada beban operasional wajar dan operasi berat tidak mudah menjadi DoS.

Endpoint yang minimal diukur:

- Dashboard Admin.
- Report sales.
- Report finance.
- Inventory report.
- Export report.
- Product search POS.

Checklist:

- [ ] Tidak ada N+1 query mencolok pada endpoint list/report.
- [ ] Kolom filter/join penting memiliki index sesuai `Schema.md`.
- [ ] Export dataset besar tidak menghabiskan memory sampai crash.
- [ ] Query date range tidak melakukan full scan yang tidak perlu jika index seharusnya tersedia.

Target p95/concurrent user **belum dikunci** karena belum ada baseline traffic nyata. Tentukan angka staging sebelum production dan simpan hasil baseline.

---

## B10. UAT per Role — 🟡

### UAT Cashier

Kasir harus mampu:

- login;
- membuat transaksi;
- menambah produk/jasa;
- melihat stok yang dibutuhkan POS;
- membuat customer;
- membuat/update service order;
- memilih mechanic;
- checkout;
- melihat receipt;
- logout.

Kasir harus **tidak mampu**:

- melihat purchase price;
- melihat Estimasi Hasil Usaha;
- melakukan stock adjustment;
- membuat expense;
- VOID PAID sale;
- mengelola user;
- melihat audit log.

### UAT Admin

Admin harus mampu:

- melihat Dashboard;
- melihat laporan;
- mengelola master;
- stock adjustment;
- expense;
- VOID dengan alasan;
- melihat audit log;
- mengelola Cashier account.

UAT harus dilakukan di perangkat yang benar-benar digunakan, termasuk browser mobile untuk Admin karena dashboard dirancang untuk monitoring jarak jauh.

---

## B11. Regression & CI Gate — 🔴

Sebelum merge/release:

- [ ] Backend test hijau.
- [ ] Frontend build berhasil.
- [ ] Dependency audit tidak memiliki Critical/High terbuka tanpa keputusan eksplisit.
- [ ] RBAC matrix tests hijau.
- [ ] Checkout/stock tests hijau.
- [ ] Void tests hijau.
- [ ] Financial data exposure tests hijau.

Contoh gate generik yang harus disesuaikan project nyata:

```bash
composer audit --no-dev
php artisan test --stop-on-failure
npm audit --omit=dev --audit-level=high
npm run build
```

Perintah ini adalah pola checklist; jangan menyatakan CI "sudah aktif" sebelum pipeline benar-benar dibuat dan dijalankan.

---

## B12. Test Case Template

```text
ID          : TC-[MODUL]-[NO]
Judul       : [contoh: Cashier tidak dapat VOID PAID sale]
Prasyarat   : [akun/data yang dibutuhkan]
Environment : [local/staging + browser/API]
Langkah     :
  1. ...
  2. ...
Diharapkan  : [hasil yang benar]
Aktual      : [isi saat eksekusi]
Status      : PASS / FAIL / BLOCKED
Bukti       : [response JSON/screenshot/log/test output]
```

---

## B13. Security Bug Report Template

```text
ID          : SEC-BUG-[NO]
Judul       : [ringkas dan spesifik]
Severity    : Critical / High / Medium / Low
Priority    : Tinggi / Sedang / Rendah
Environment : [staging/production, role, browser/API]
Reproduksi  :
  1. ...
  2. ...
Diharapkan  : ...
Aktual      : ...
Dampak      : ...
Bukti       : screenshot / response JSON / log
Regression  : [test ID yang menangkap bug]
Status      : Open / Fixed / Verified
```

---

# BAGIAN C — DEPLOY & POST-DEPLOY

## C1. Go / No-Go Gate — 🔴

Production **tidak boleh** digunakan sebagai sistem utama bengkel sebelum:

- [ ] Tidak ada Critical terbuka.
- [ ] Tidak ada High terbuka.
- [ ] Automated test kritis hijau.
- [ ] RBAC matrix telah dijalankan.
- [ ] Semua abuse case Critical dijalankan dan tidak FAIL.
- [ ] Smoke test staging lulus.
- [ ] Backup sudah dibuat.
- [ ] Restore backup pernah diuji.
- [ ] HTTPS aktif.
- [ ] `APP_DEBUG=false`.
- [ ] Secret production benar dan bukan credential development.
- [ ] Rollback plan tertulis.

---

## C2. Pre-Deploy Checklist — 🔴

### Application

- [ ] `APP_ENV=production`.
- [ ] `APP_DEBUG=false`.
- [ ] `APP_KEY` production valid dan unik.
- [ ] CORS production menggunakan origin yang benar.
- [ ] Auth/session/token production dikonfigurasi sesuai domain HTTPS.
- [ ] Timezone display sistem sesuai zona operasional bengkel yang sudah ditetapkan proyek.
- [ ] Error response production tidak membocorkan detail internal.

### Database

- [ ] Credential production berbeda dari development.
- [ ] Migration diuji di staging.
- [ ] Backup dibuat sebelum migration production.
- [ ] Foreign key/unique/check/index yang dibutuhkan benar-benar aktif pada DB production.
- [ ] Constraint `current_stock >= 0`/invariant aplikasi telah diuji.

### Repository & build

- [ ] `.env` tidak ada di git.
- [ ] Lockfile backend/frontend ter-commit.
- [ ] Dependency audit dijalankan.
- [ ] Frontend production build berhasil.
- [ ] Tidak ada debug endpoint/tool yang terekspos.

### Backup

- [ ] Backup terbaru tersedia.
- [ ] Lokasi backup tidak public.
- [ ] Procedure restore diketahui penanggung jawab.

---

## C3. Deployment Smoke Test — 🟠

Setelah deploy, jalankan dengan data test terkendali:

1. Login Admin.
2. Login Cashier.
3. Pastikan Cashier tidak dapat membuka endpoint Admin.
4. Buat satu transaksi DRAFT.
5. Checkout transaksi dengan item stock.
6. Pastikan stock berkurang.
7. Buka receipt.
8. Buat service order sederhana.
9. Jalankan report Admin.
10. Jalankan satu export Admin.
11. Pada staging/test data, VOID satu transaksi dan pastikan stock kembali.
12. Logout dan pastikan protected endpoint tidak dapat dipakai lagi.

Jangan melakukan test destructive pada data transaksi pelanggan production tanpa prosedur yang jelas.

---

## C4. Post-Deploy 24–72 Jam — 🟠

- [ ] Pantau error 5xx.
- [ ] Pantau login failure yang tidak wajar.
- [ ] Rekonsiliasi beberapa transaksi pertama dengan stok aktual.
- [ ] Verifikasi Dashboard dan Sales Report mempunyai revenue konsisten.
- [ ] Verifikasi VOID tidak menyebabkan stok ganda.
- [ ] Verifikasi expense hanya dapat dikelola Admin.
- [ ] Konfirmasi `/.env`, `.git`, debug route tidak dapat diakses.
- [ ] Konfirmasi security headers production.
- [ ] Konfirmasi backup pertama setelah go-live benar-benar terbentuk.
- [ ] Catat baseline response time untuk Dashboard/report.

---

## C5. Pemicu Rollback / Maintenance — 🔴

Rollback atau maintenance mode harus dipertimbangkan jika:

- Checkout gagal secara sistemik.
- Sale tercatat PAID tetapi stock tidak berkurang.
- Stock menjadi negatif.
- VOID menggandakan stock.
- Kasir dapat membuka fungsi Admin.
- Revenue/report menghasilkan angka tidak konsisten secara luas.
- Data pelanggan terekspos tanpa otorisasi.
- Credential production terkonfirmasi bocor.
- Migration merusak integritas data.

Jika rollback database berpotensi menghapus transaksi baru yang sudah terjadi setelah deployment, jangan melakukan rollback buta. Bekukan fitur bermasalah, backup kondisi terkini, lalu tentukan recovery berdasarkan bukti transaksi.

---

# BAGIAN D — SECURITY TEST MATRIX PER DOMAIN

## D1. Auth

| Test | Expected |
|---|---|
| Credential valid + user aktif | Login berhasil |
| Password salah | Ditolak tanpa detail sensitif |
| User tidak ada | Pesan tidak membocorkan enumeration |
| User nonaktif | Login ditolak |
| Request protected tanpa auth | 401 |
| Logout lalu reuse credential session/token lama | Ditolak sesuai mekanisme auth |

## D2. POS / Sale

| Test | Expected |
|---|---|
| Create DRAFT | berhasil untuk Admin/Cashier |
| Edit DRAFT | berhasil sesuai validasi |
| Edit PAID | ditolak |
| Checkout stock cukup | PAID + stock movement |
| Checkout stock tidak cukup | rollback/ditolak |
| Manipulasi total frontend | diabaikan/recalculate backend |
| Double checkout | hanya satu finalisasi |
| Negative quantity | 422 |

## D3. VOID

| Test | Expected |
|---|---|
| Cashier VOID | 403 |
| Admin VOID PAID + reason | berhasil |
| Blank reason | 422 |
| VOID DRAFT | ditolak |
| VOID already VOID | ditolak |
| VOID success | stock kembali sekali + audit log |

## D4. Inventory

| Test | Expected |
|---|---|
| Cashier stock adjustment | 403 |
| Admin adjustment + reason | berhasil + movement |
| Edit product dengan current_stock paksa | tidak mengubah stock melalui jalur master |
| Concurrent last stock checkout | stock tidak negatif |
| Delete stock movement | tidak tersedia/ditolak |

## D5. Finance

| Test | Expected |
|---|---|
| Cashier view finance report | 403 |
| Cashier inspect product JSON | purchase_price tidak ada |
| Cashier inspect sale item JSON | purchase_price_snapshot tidak ada |
| VOID sale pada report | tidak termasuk revenue aktif |
| Master purchase price berubah | historical COGS tidak berubah |

## D6. Audit

| Test | Expected |
|---|---|
| Cashier GET audit log | 403 |
| Admin GET audit log | berhasil |
| VOID | audit event ada |
| stock adjustment | audit event ada |
| user change | audit event ada |
| password/token di audit JSON | tidak boleh ada |

---

# BAGIAN E — REQUIRED AUTOMATED TESTS

Nama test boleh mengikuti convention project, tetapi perilaku berikut tidak boleh hilang:

### Authentication / RBAC

- `inactive_user_cannot_login`
- `unauthenticated_user_cannot_access_protected_api`
- `cashier_cannot_access_admin_dashboard`
- `cashier_cannot_manage_users`
- `cashier_cannot_access_audit_logs`
- `cashier_cannot_access_finance_report`
- `cashier_response_does_not_expose_purchase_price`

### POS / Inventory

- `cashier_can_checkout_valid_sale`
- `checkout_recalculates_totals_server_side`
- `negative_quantity_is_rejected`
- `insufficient_stock_is_rejected`
- `checkout_failure_rolls_back_sale_and_stock`
- `checkout_creates_sale_stock_movement`
- `concurrent_checkout_does_not_make_stock_negative`
- `paid_sale_cannot_be_edited`
- `double_checkout_does_not_duplicate_stock_movement`

### VOID

- `cashier_cannot_void_paid_sale`
- `admin_can_void_paid_sale_with_reason`
- `void_without_reason_is_rejected`
- `void_restores_stock_once`
- `already_void_sale_cannot_be_voided_again`
- `void_is_written_to_audit_log`

### Financial integrity

- `paid_sale_snapshot_stays_unchanged_after_product_price_update`
- `void_sale_is_excluded_from_revenue`
- `estimated_operating_result_uses_snapshot_cogs_and_recorded_expenses`
- `dashboard_and_report_use_same_revenue_definition`

### Expense

- `cashier_cannot_manage_expenses`
- `expense_amount_must_be_positive`
- `expense_change_is_audited`

---

# BAGIAN F — IMPLEMENTATION AUDIT ORDER

Security work dilakukan setelah fitur utama tersedia, dengan urutan:

1. Audit seluruh route aktual.
2. Buat matriks route × role aktual dan bandingkan dengan B5.
3. Audit Form Request/mass assignment.
4. Audit response serialization untuk data finansial sensitif.
5. Buat/finalkan RBAC automated tests.
6. Audit checkout + concurrency + rollback.
7. Audit VOID + idempotency.
8. Audit expense + report formula.
9. Audit audit-log implementation.
10. Audit session/token implementation yang benar-benar dipilih.
11. Audit CORS/security headers/error handling.
12. Audit secrets/repository/dependencies.
13. Jalankan abuse cases.
14. Jalankan E2E critical flows.
15. Uji backup restore.
16. Deploy staging.
17. Smoke test.
18. Baru lakukan production release jika Go/No-Go gate terpenuhi.

Setiap temuan Critical/High harus diperbaiki sebelum production.

---

# BAGIAN G — SECURITY ACCEPTANCE CRITERIA

## Authentication & Role

- [ ] Role hanya ADMIN/CASHIER.
- [ ] User nonaktif tidak bisa login.
- [ ] Password hashed.
- [ ] Tidak ada password default production.
- [ ] Cashier tidak dapat endpoint Admin.
- [ ] Field Admin tidak bocor ke Cashier.

## POS & Inventory

- [ ] Total dihitung backend.
- [ ] Stock lock/concurrency protection teruji.
- [ ] Stock tidak dapat negatif akibat sale.
- [ ] Setiap perubahan stok memiliki stock movement.
- [ ] PAID sale immutable untuk Cashier.
- [ ] Double checkout tidak menggandakan transaksi/movement.

## VOID

- [ ] Admin only.
- [ ] Reason mandatory.
- [ ] Restore stock atomik.
- [ ] Hanya sekali.
- [ ] Audit log ada.
- [ ] Sale tidak dihapus.

## Finance

- [ ] Purchase price hanya Admin.
- [ ] Estimated Operating Result hanya Admin.
- [ ] Kasir tidak dapat finance report/export.
- [ ] Report menggunakan snapshot transaction.
- [ ] Dashboard/report konsisten.

## Application Security

- [ ] Backend validation aktif.
- [ ] Injection/XSS tests lulus.
- [ ] HTTPS production.
- [ ] CORS eksplisit.
- [ ] Security headers production diverifikasi.
- [ ] APP_DEBUG false.
- [ ] `.env`/`.git`/logs tidak public.
- [ ] Tidak ada secret frontend/repository.

## Audit & Recovery

- [ ] Audit logs immutable via normal UI/API.
- [ ] Log tidak menyimpan credential.
- [ ] Backup terjadwal.
- [ ] Restore pernah diuji.
- [ ] Incident procedure tersedia.
- [ ] Rollback/maintenance trigger jelas.

## QA

- [ ] Unit tests kritis lulus.
- [ ] Feature tests 401/403/422/side-effect lulus.
- [ ] RBAC matrix automated tests lulus.
- [ ] Abuse cases tidak mempunyai FAIL Critical/High.
- [ ] E2E critical flows lulus.
- [ ] Dependency audit tidak menyisakan Critical/High tanpa keputusan eksplisit.

---

# BAGIAN H — CONSISTENCY RULES DENGAN 5 DOKUMEN UTAMA

Security implementation **tidak boleh** mengubah aturan berikut:

1. Role hanya `ADMIN` dan `CASHIER`.
2. `MECHANIC` bukan user.
3. Cashier boleh menjalankan POS dan service-order operational flow.
4. Cashier tidak dapat VOID PAID sale.
5. VOID hanya Admin dan reason wajib.
6. PAID/VOID sale tidak hard delete.
7. Revenue berasal dari sale PAID.
8. Tidak ada tabel pemasukan manual.
9. Expense hanya Admin.
10. Setiap perubahan stock mempunyai `stock_movements`.
11. Stock tidak boleh negatif akibat sale.
12. Checkout dan VOID atomik.
13. Sale item menyimpan price snapshot.
14. Cashier tidak melihat purchase price.
15. Estimated Operating Result bukan laba akuntansi formal dan hanya untuk Admin.
16. Dashboard dan report memakai formula yang sama.
17. Audit log tidak dapat diedit/dihapus melalui aplikasi normal.
18. Mekanik tidak dibebani login/aplikasi.

Jika security requirement baru membutuhkan perubahan salah satu poin di atas, hentikan implementasi dan lakukan perubahan terkoordinasi pada dokumen sumber terlebih dahulu.

---

# BAGIAN I — CATATAN UNTUK AI CODING ASSISTANT / KONTRIBUTOR

AI atau kontributor **boleh**:

- membuat test berdasarkan matrix di dokumen ini;
- menambahkan middleware/policy yang diperlukan untuk memenuhi role existing;
- memperketat validation;
- memperbaiki mass-assignment exposure;
- memperbaiki transaction/locking;
- menambahkan security headers;
- menambahkan rate limiting;
- memperbaiki logging agar tidak menyimpan secret;
- menambahkan dependency audit/CI gate;
- membuat backup/restore documentation sesuai platform yang benar-benar dipilih.

AI atau kontributor **tidak boleh** tanpa requirement baru:

- membuat role mekanik;
- membuat customer login;
- membuat public register;
- membuat upload file;
- membuat WebSocket;
- membuat tabel pemasukan manual;
- mengubah formula Estimasi Hasil Usaha;
- memberi Cashier akses VOID;
- memberi Cashier purchase price;
- menghapus stock movement ledger;
- hard-delete PAID/VOID sale;
- hard-delete audit log;
- memilih provider deployment lalu menulis seolah sudah digunakan;
- menulis status `PASS` tanpa menjalankan test;
- mengarang endpoint/schema yang tidak ada untuk sekadar memenuhi checklist.

Jika implementation detail belum diketahui, gunakan status `BLOCKED/TBD` dan tuliskan keputusan apa yang masih diperlukan.

---

# BAGIAN J — FINAL RELEASE SIGN-OFF

Isi hanya setelah test nyata dilakukan.

```text
Release version        : ____________________
Environment            : ____________________
Frontend URL            : ____________________
Backend/API URL         : ____________________
Database environment   : ____________________
Auth mechanism final   : ____________________
Hosting provider       : ____________________
Backup location        : ____________________
RPO                     : ____________________
RTO                     : ____________________

RBAC test               : PASS / FAIL / BLOCKED
POS/stock tests         : PASS / FAIL / BLOCKED
VOID tests              : PASS / FAIL / BLOCKED
Finance access tests    : PASS / FAIL / BLOCKED
Abuse cases             : PASS / FAIL / BLOCKED
E2E                     : PASS / FAIL / BLOCKED
Dependency audit        : PASS / FAIL / BLOCKED
Backup restore          : PASS / FAIL / BLOCKED
Staging smoke test      : PASS / FAIL / BLOCKED

Critical open findings  : ____
High open findings      : ____
Medium open findings    : ____
Low open findings       : ____

Go / No-Go              : ____________________
Reviewed by             : ____________________
Date                    : ____________________
Notes                   : ____________________
```

Tidak boleh menetapkan `GO` jika masih ada Critical/High terbuka atau alur checkout/stok/RBAC utama belum teruji.

---

## Referensi Internal

Dokumen ini disusun untuk menyesuaikan security-hardening/QA/deploy-readiness template yang diberikan pengguna dengan requirement aktual Bengkel POS & Monitoring.

Source of truth internal tetap:

- `PRD.md`
- `Architecture.md`
- `Design.md`
- `Schema.md`
- `Rules.md`

Rujukan keamanan eksternal yang disebut oleh template sumber (misalnya OWASP dan regulasi privasi) harus diverifikasi terhadap sumber primer dan versi yang berlaku jika akan dipakai untuk klaim akademik, legal, atau compliance formal.

**Batasan:** kelulusan checklist ini bukan sertifikat keamanan dan tidak menggantikan penetration test pihak ketiga jika di kemudian hari skala, exposure internet, atau nilai data/transaksi sistem meningkat secara signifikan.
