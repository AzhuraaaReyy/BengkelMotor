# Design.md

## 1. Design Goals

Desain Bengkel POS & Monitoring harus mendukung dua karakter pengguna:

- **Kasir** membutuhkan kecepatan, sedikit langkah, informasi transaksi yang jelas, dan risiko salah input yang rendah.
- **Admin/Pemilik** membutuhkan ringkasan bisnis yang dapat dibaca cepat dari mobile karena tidak selalu berada di bengkel.

Desain tidak dibuat sebagai ERP kompleks. Navigasi dan jumlah layar dijaga tetap terbatas pada fungsi MVP.

---

## 2. Information Architecture

### 2.1 Menu Admin

1. Dashboard
2. POS
3. Servis (tab **Order Servis** & **Pelanggan** di satu halaman `/servis`)
4. Produk & Stok
5. Jasa Servis
6. Pengeluaran
7. Laporan
8. Pengguna
9. Audit Log

### 2.2 Menu Kasir

1. POS
2. Servis (tab **Order Servis** & **Pelanggan** di satu halaman `/servis`)
3. Riwayat Transaksi

Kasir dapat mencari stok dari dalam POS tanpa diberikan menu manajemen stok penuh.

---

## 3. Primary User Flows

### 3.1 Kasir — Penjualan Sparepart

```text
Login
 -> POS
 -> cari produk
 -> tambah ke keranjang
 -> ubah qty jika perlu
 -> pilih pelanggan opsional
 -> pilih metode pembayaran
 -> konfirmasi total
 -> checkout
 -> nota tampil
```

Jika stok tidak cukup, sistem menampilkan error pada item terkait dan tidak menyelesaikan pembayaran.

### 3.2 Kasir — Servis Motor

```text
Login
 -> Servis (tab Order Servis)
 -> Order Baru
 -> isi 1 form: No. WA + Nama + Tipe Motor + Keluhan + Catatan Diagnosa
    - sudah terdaftar?  sistem mencocokkan No. WA (debounce) → Nama & No. WA terkunci,
      Tipe Motor terisi otomatis dari master tapi tetap bisa diedit (khusus order ini)
    - belum terdaftar?  semua field editable; saat simpan, pelanggan auto-didaftarkan
 -> simpan order → otomatis berstatus "Baru" (tanpa pilihan status)
 -> saat pembayaran: pilih "Transaksi" / "Buat Transaksi" → POS
 -> tambah jasa + sparepart
 -> checkout
 -> nota
 -> order otomatis menjadi "Selesai" (DONE) begitu transaksi dibayar
 -> tombol Transaksi hilang setelah order dibayar/selesai
```

Mekanik tidak perlu membuka sistem. Field mekanik di-nonaktifkan dari UI (backend & master data tetap ada).

### 3.3 Admin — Monitoring Jarak Jauh

```text
Login dari mobile
 -> Dashboard
 -> lihat omzet hari ini
 -> lihat transaksi dan order servis
 -> lihat pengeluaran
 -> lihat low stock
 -> buka laporan jika perlu detail
```

### 3.4 Kasir/Admin — Restock & Adjust Stok

```text
Produk & Stok
 -> pilih produk
 -> Atur Stok
 -> pilih tipe PURCHASE (stok masuk/restock) atau ADJUSTMENT (koreksi/opname)
 -> isi Jumlah Perubahan (delta bertanda, integer) + catatan wajib
    PURCHASE:
       - input "Jumlah Ditambahkan" (min 1)
       - pratinjau stok akhir; tidak membuat pengeluaran otomatis
    ADJUSTMENT:
       - input "Jumlah Perubahan" (bisa minus = pengurangan)
       - pratinjau stok akhir; tidak membuat pengeluaran otomatis
 -> simpan (1 transaksi DB)
 -> current_stock = stok sebelum + delta
 -> stock movement tercatat (sebelum, jumlah, sesudah, waktu, petugas)
```

Catatan:

- Input adalah **delta**, bukan nilai stok absolut (contoh: stok 3 + input 7 → 10).
- Master produk (create/update + Harga Beli) hanya Admin; Kasir dapat melakukan restock/adjust stok.
- Harga beli untuk konteks Atur Stok dikirim hanya pada halaman Produk & Stok (`?include_cost=1`), tidak pada POS.
- Pengeluaran tidak dibuat otomatis dari restock; Admin mencatat pengeluaran manual melalui Manajemen Pengeluaran. Expense legacy **Pembelian Stok** tetap tampil sebagai histori dan tetap terkunci.

### 3.5 Admin — Void Transaksi

```text
Riwayat/Laporan Penjualan
 -> buka transaksi PAID
 -> pilih VOID
 -> sistem meminta alasan
 -> konfirmasi
 -> status menjadi VOID
 -> stok dikembalikan
 -> audit log dibuat
```

Tidak ada tombol delete permanen pada transaksi PAID/VOID.

---

## 4. Dashboard Design

Dashboard Admin dibuat mobile-first untuk monitoring.

### 4.1 KPI Cards

Kartu utama:

- Omzet Hari Ini
- Transaksi Hari Ini
- Servis Hari Ini
- Pengeluaran Hari Ini
- Estimasi Hasil Usaha Periode
- Low Stock Count

Kartu tidak menampilkan angka dekoratif yang tidak dapat ditelusuri ke data backend.

### 4.2 Charts

Minimal:

- Grafik omzet harian pada periode terpilih.
- Breakdown penjualan produk vs jasa.

Chart bersifat pendukung; angka total utama tetap ditampilkan dalam teks.

### 4.3 Operational Lists

- Produk stok rendah.
- Transaksi terbaru.
- Void terbaru.

Tabel/list pada mobile menggunakan layout yang tetap dapat dibaca tanpa horizontal scroll berlebihan.

---

## 5. POS Screen Design

POS menjadi layar paling sering digunakan Kasir.

### Desktop/Tablet

```text
+-------------------------------------------------------------+
| Search Produk/Jasa                                          |
+------------------------------+------------------------------+
| Katalog / Search Result      | Keranjang                    |
| - Produk                     | Item        Qty       Total   |
| - Jasa                       | ...                          |
|                              |                              |
|                              | Subtotal                     |
|                              | Diskon                       |
|                              | Grand Total                  |
|                              | Payment Method               |
|                              | [ BAYAR ]                    |
+------------------------------+------------------------------+
```

### Mobile

- Search tetap di bagian atas.
- Katalog dan keranjang menggunakan switch/tab atau bottom sheet.
- Grand total dan tombol bayar selalu mudah dijangkau.

### POS Interaction Rules

- Pencarian dapat berdasarkan nama atau SKU.
- Produk menampilkan stok tersedia.
- Jasa tidak menampilkan stok.
- Qty tidak boleh <= 0.
- Tombol bayar disabled jika keranjang kosong.
- Konfirmasi akhir menampilkan total dan metode pembayaran.
- Setelah PAID, layar receipt ditampilkan dan transaksi tidak dapat diedit oleh Kasir.

---

## 6. Service Order Screen

Halaman `/servis` adalah **satu halaman dua tab** (menu tunggal "Servis"): tab **Order Servis** dan tab **Pelanggan**. State tab lewat URL (`?tab=customers`), default ke Order Servis; URL lama `/pelanggan` di-redirect ke `/servis?tab=customers`.

### List View

Toolbar satu baris (Card): **pencarian** (flex) di kiri + **filter status** (Semua / Baru / Selesai) dan tombol **"+ Order Baru"** di samping kanannya (menempel). Di layar sempit (<`sm`): search lebar penuh, lalu filter status & tombol "+ Order Baru" menumpuk **selebar penuh** (mobile-friendly CTA).

Menampilkan:

- Kode order.
- Pelanggan.
- Tipe Motor.
- Status (badge "Baru"/"Selesai").
- Waktu masuk.
- Aksi (Lihat Detail, Edit, Hapus, "Transaksi" → POS).

Filter:

- pencarian (nama pelanggan),
- status (Semua / Baru / Selesai).

Aksi per baris (tabel & kartu mobile):

- **Lihat Detail** — buka modal **Detail Order**; tampil **hanya saat status Selesai (DONE)** (kode order, pelanggan + no. telp, tipe motor, status, kasir, waktu masuk/selesai, keluhan, catatan diagnosa, dan **Transaksi terkait** bila ada).
- **Edit** (pensil) — hanya untuk **OPEN/IN_PROGRESS** (belum terminal).
- **Hapus** — tampil **di semua status** (OPEN/IN_PROGRESS/CANCELLED/DONE), dengan konfirmasi. Jika order punya transaksi, order dihapus tapi **transaksi/nota tetap tersimpan** (kaitan `sale.service_order_id` dikosongkan); audit log mencatat `sale_unlinked`.
- **Transaksi / Buat Transaksi** — tampil hanya selama order **belum punya sale** dan bukan CANCELLED/DONE. Begitu transaksi dibayar, order otomatis **Selesai (DONE)** dan tombol Transaksi menghilang.
- **Tidak ada tombol "Selesai" manual** — status Selesai otomatis tercapai saat transaksi dibayar.

### Modal Order Baru (satu form berbasis no. telepon, tanpa status)

Satu form berisi **Nama, No. WA/Telepon, Tipe Motor, Keluhan Pelanggan, Catatan Diagnosa**:

- Kasir mengetik No. WA; sistem mencocokkan nomor (normalisasi spasi/tanda pisah, debounce 400ms).
- **Sudah terdaftar** → kartu hijau "Sudah terdaftar" tampil; Nama & No. WA terkunci (read-only). **Tipe Motor terisi otomatis dari `customers.motorcycle_type` namun tetap bisa diedit** — nilai disimpan ke `service_orders.motorcycle_type` (motor per order), tidak mengubah master pelanggan.
- **Belum terdaftar** → semua field editable; saat Simpan, pelanggan baru otomatis didaftarkan (`customers.motorcycle_type` ikut terisi) lalu order dibuat.
- Kolom **Mekanik tidak ada di UI** (di-nonaktifkan; backend tetap menerima `mechanic_id`).
- **Status tidak ada di form** — order baru otomatis "Baru" (OPEN) dan menjadi "Selesai" saat transaksinya dibayar.

Layout responsif (target tablet & desktop):

- `md:` ke atas → 2 kolom: kiri = Nama / No. WA / Tipe Motor; kanan = Keluhan + Catatan Diagnosa (textarea `rows=4`).
- Phone (<`md`) → 1 kolom terstack.
- Teks bantuan & kartu "Sudah terdaftar" selebar penuh.

### Detail Order (modal)

Dibuka lewat tombol **Lihat Detail**; memuat data lengkap dari `GET /service-orders/{id}`:

1. Informasi pelanggan (nama + no. telp).
2. Tipe motor.
3. Keluhan.
4. Status servis.
5. Catatan hasil.
6. Kasir & waktu masuk/selesai.
7. Referensi transaksi/nota jika sudah ada (kode sale, status, total, waktu bayar).

Kasir tidak melihat data biaya internal seperti harga beli sparepart.

---

## 7. Product & Inventory Screen

Dapat diakses oleh Admin dan Kasir (Fase 3). Kasir dapat melihat, mencari, mengatur stok, dan melihat riwayat; hanya Admin yang membuat/mengubah master produk (termasuk Harga Beli).

Kolom utama:

- SKU.
- Nama.
- Kategori.
- Harga jual.
- Stok.
- Minimum stok.
- Status.
- Aksi: tombol **Atur Stok** (CTA primary) dan **Riwayat** (CTA secondary) untuk kedua role; tombol Edit hanya untuk Admin.

Harga beli hanya ditampilkan di layar Admin.

Pagination 10 item per halaman agar daftar ringan dan cepat dimuat.

Produk low stock diberi badge/peringatan visual (`Stok Rendah` / `Habis`), dengan teks sebagai penanda utama (bukan warna saja).

### 7.1 Riwayat Stok (detail)

Modal Riwayat menampilkan histori stock movement dengan informasi lengkap per baris:

- **Arah** — badge `Stok Masuk` (IN) / `Stok Keluar` (OUT). OPENING/PURCHASE/VOID_RETURN selalu masuk; SALE keluar; ADJUSTMENT mengikuti tanda perubahan.
- **Tipe** — label pergerakan (`Pembelian`, `Penjualan`, `Penyesuaian`, dst).
- **Perubahan** — nilai bertanda (+/-).
- **Sebelum / Sesudah** — stok sebelum dan setelah.
- **Petugas** — nama user yang melakukan penambahan/penyesuaian.
- **Keterangan** — gabungan kode transaksi (jika ada) dan catatan.
- **Waktu**.

Baris ringkasan di atas tabel menampilkan stok saat ini, stok minimum, dan status (`Aman` / `Menipis` / `Habis`) agar owner dapat mengantisipasi stok habis.

### 7.2 Notifikasi Stok Menipis / Habis

Threshold notifikasi: **stok < 5 unit** (stok 0–4). Hanya berlaku untuk notifikasi; badge `Stok Rendah` di tabel dan low stock dashboard tetap memakai `min_stock` per produk.

- **Banner** — saat ada produk di bawah threshold, banner peringatan muncul di atas konten (untuk Admin & Kasir) berisi jumlah produk habis/menipis, tombol "Lihat Produk & Stok", dan tombol **X** untuk menutup.
- **Bell di topbar** — setelah banner ditutup (atau sejak awal), peringatan ditampilkan lewat icon lonceng di topbar dengan badge jumlah. Dropdown menampilkan **seluruh** produk bermasalah, dikelompokkan `Habis` (stok 0) dan `Menipis` (stok 1–4).
- Notifikasi otomatis hilang begitu semua produk sudah di-restock ke stok ≥ 5; refresh dilakukan tiap navigasi dan poll ringan 60 detik (tidak mengganggu operasional).

---

## 8. Expense Screen

Admin dapat:

- melihat daftar pengeluaran,
- menambah pengeluaran,
- mengubah pengeluaran jika belum terkunci oleh kebijakan bisnis,
- melihat kategori dan total berdasarkan periode.

Form minimal:

- tanggal,
- kategori,
- nominal,
- deskripsi.

Nominal diformat sebagai Rupiah pada UI, tetapi dikirim sebagai nilai numerik yang valid ke API.

Pengeluaran legacy **Pembelian Stok**:

- data lama dari restock otomatis tetap tampil sebagai histori;
- tetap **terkunci** — tidak memiliki tombol Edit (backend menolak dengan 403 `EXPENSE_LOCKED`);
- restock baru tidak membuat pengeluaran otomatis; Admin mencatat pengeluaran manual bila diperlukan.

---

## 9. Reports Screen

Laporan menggunakan pola konsisten:

1. Header laporan.
2. Date range filter.
3. KPI ringkas.
4. Tabel detail.
5. Export action untuk Admin.

Jenis laporan:

- Penjualan.
- Servis.
- Stok.
- Keuangan sederhana.

Semua laporan harus menggunakan definisi data yang sama dengan PRD dan backend. Contohnya, omzet hanya berasal dari transaksi PAID dan transaksi VOID tidak dihitung sebagai omzet aktif.

---

## 10. Design System

### 10.1 Principles

- Sederhana.
- Cepat dibaca.
- Berorientasi task.
- Tidak terlalu banyak dekorasi.
- Responsive.
- Kontras cukup.
- Status selalu memiliki teks, bukan hanya warna.

### 10.1.1 Judul & Deskripsi Halaman (Topbar)

Judul (H1) dan deskripsi (P) setiap halaman dirender **hanya di topbar sticky**, bersumber dari `PAGE_META` di `AppShell` (satu H1 per halaman, aksesibel). Konten halaman **tidak** menampilkan H1/P ulang:

- Desktop: kiri topbar = H1 + P (truncate), kanan = bell notifikasi stok.
- Mobile: hamburger + H1 + P satu baris (truncate) + bell.
- Tombol aksi halaman ("Produk Baru", "Order Baru", "Export", "Segarkan", dst.) tetap di **bar aksi kanan-atas konten** (`PageHeader` tanpa judul; tidak dirender jika tidak ada aksi).
- POS: topbar menampilkan "POS"; heading katalog "Produk & Jasa" di konten adalah judul seksi, bukan judul halaman.
- Halaman tab (mis. `/servis` = Order Servis + Pelanggan): topbar menampilkan judul menu ("Servis"), bar tab di atas konten, dan masing-masing tab mempertahankan bar aksi kanan-atasnya sendiri.

### 10.2 Color Tokens

Gunakan token semantik, bukan warna hard-coded di setiap komponen:

- `--color-primary`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`
- `--color-bg`
- `--color-surface`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-border`

Warna final ditentukan pada implementasi design system dan dipakai konsisten.

### 10.3 Typography

Gunakan satu keluarga font sans-serif yang mudah dibaca.

Scale minimum:

- Page title.
- Section title.
- Body.
- Caption/helper.
- Numeric KPI emphasis.

Angka finansial pada dashboard harus memiliki hierarki visual lebih kuat dibanding label.

### 10.4 Spacing

Gunakan spacing scale konsisten, misalnya basis 4px/8px. Jangan membuat margin/padding acak per halaman.

### 10.5 Radius dan Shadow

- Radius moderat untuk card, input, dialog.
- Shadow ringan hanya untuk membedakan surface.
- Hindari efek glow/gradient berlebihan yang tidak membantu fungsi.

---

## 11. Core UI Components

Komponen reusable minimum:

- `AppShell`
- `Sidebar`
- `Topbar`
- `PageHeader`
- `Button`
- `IconButton`
- `Input`
- `Select`
- `SearchInput`
- `CurrencyInput`
- `DateRangePicker`
- `Badge`
- `Card`
- `StatCard`
- `DataTable`
- `Pagination`
- `Modal/Dialog`
- `ConfirmDialog`
- `Toast`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ProductSearchCard`
- `CartItem`
- `PaymentMethodSelector`
- `ReceiptView`
- `StockBadge`
- `ServiceStatusBadge`

Komponen bisnis tidak boleh menanamkan permission hanya pada UI; permission final tetap di backend.

---

## 12. Status Semantics

### Sale

- DRAFT
- PAID
- VOID

### Service Order

Status yang dipakai di UI hanya **2** (untuk menyederhanakan kasir):

- OPEN — "Baru": status otomatis setiap order baru (tidak ada pilihan status di form).
- DONE — "Selesai": dicapai **otomatis** begitu transaksi POS yang ditautkan dibayar (checkout). Tidak ada tombol "Selesai" manual; setelah dibayar order terkunci dan tombol Transaksi hilang.

Status lain tetap ada di DB (ENUM) sebagai **dormant/legacy**:

- IN_PROGRESS — "Dikerjakan" (data lama; badge tetap dirender).
- CANCELLED — "Dibatalkan" (dormant, terkunci).

### Product

- ACTIVE
- INACTIVE
- LOW_STOCK adalah state turunan dari `current_stock <= min_stock`, bukan status database permanen.

---

## 13. Form Validation UX

- Validasi sederhana dilakukan di frontend untuk feedback cepat.
- Backend tetap melakukan validasi final.
- Error field ditampilkan dekat input.
- Error business rule seperti stok tidak cukup ditampilkan dekat item dan sebagai notification.
- Tombol submit mencegah double click ketika request berjalan.

---

## 14. Destructive Action Design

Operasi berisiko seperti VOID dan stock adjustment memakai confirmation dialog.

VOID transaksi wajib meminta alasan sebelum submit.

Contoh isi dialog:

```text
Void transaksi TRX-000123?
Stok sparepart dari transaksi ini akan dikembalikan.

Alasan: [_______________________]

[Batal] [Void Transaksi]
```

Tidak ada aksi `Hapus Permanen` untuk transaksi PAID/VOID pada UI normal.

---

## 15. Empty, Loading, and Error States

Setiap halaman data wajib memiliki:

- loading state,
- empty state,
- error state,
- retry action jika sesuai.

Contoh low stock kosong:

`Tidak ada produk yang berada di bawah batas minimum.`

Jangan menampilkan tabel kosong tanpa penjelasan.

---

## 16. Responsive Decisions

### Tablet-first

Breakpoint sidebar `md:` → `lg:` — di tablet portrait sidebar berubah menjadi drawer (hamburger) dan konten full-width; sidebar tetap ada dari `lg:` ke atas.

### Mobile

Prioritas:

- Dashboard.
- Riwayat transaksi (kartu mobile).
- Produk & Stok (kartu mobile).
- Pelanggan (kartu mobile).
- Service order overview.
- Basic POS (katalog & keranjang, POS tetap satu layar).

POS:

- Grid dua kolom dimulai di `md:` (`md:grid-cols-12`, katalog 7 kolom / keranjang 5 kolom; di `lg:` 8/4).
- Di bawah `md:` (phone) katalog di atas, keranjang di bawah, dan **sticky bottom bar** "Keranjang (n) · Rp X" muncul saat keranjang terisi → scroll ke panel keranjang.

### Desktop/Tablet

Prioritas:

- POS dua kolom.
- Data table dengan banyak kolom.
- Inventory management.
- Laporan lengkap.

Sidebar dapat berubah menjadi drawer pada layar kecil. Tabel desktop `hidden lg:block`, kartu mobile `lg:hidden` (Produk & Stok, Pelanggan, Riwayat Transaksi).

---

## 17. Accessibility Baseline

- Semua form memiliki label.
- Tombol icon memiliki accessible label.
- Focus state terlihat.
- Kontras teks cukup.
- Error tidak hanya disampaikan dengan warna.
- Dialog dapat digunakan dengan keyboard.
- Tabel penting memiliki heading yang jelas.

---

## 18. Technical Design Decisions

1. **Frontend permissions hanya untuk presentasi.** Authorization final selalu dari backend.
2. **Data uang diformat di presentation layer.** Nilai bisnis disimpan sebagai decimal di backend/database.
3. **Low stock dihitung, bukan disimpan sebagai boolean tetap.** Mencegah state basi.
4. **Paid sale UI immutable untuk Cashier.** Konsisten dengan business rule dan audit.
5. **Mechanic di-nonaktifkan dari UI.** Master data `mechanics` dan API tetap ada (dormant), tetapi field mekanik tidak tampil di form/kolom order servis untuk menjaga alur kasir tetap sederhana; tidak ada login atau aplikasi mekanik.
6. **Service order tidak menjadi sumber revenue.** Revenue hanya berasal dari sale PAID.
7. **Dashboard dan report memakai definisi metric yang sama.** Tidak boleh ada formula berbeda antara frontend dan backend.
8. **Receipt memakai data snapshot sale.** Nota historis tidak berubah saat master produk/jasa berubah.

---

## 19. Screen Acceptance Checklist

Sebuah screen dianggap selesai jika:

- role yang benar dapat mengakses,
- role yang salah mendapat akses ditolak,
- loading/empty/error state ada,
- responsive minimal mobile dan desktop,
- validation backend ditampilkan dengan benar,
- tidak ada data sensitif Admin bocor ke Kasir,
- destructive action memakai confirmation,
- terminology konsisten dengan PRD, Architecture, Schema, dan Rules.
