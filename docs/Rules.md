# Rules.md

## 1. Tujuan

Dokumen ini menjadi aturan kerja bersama untuk developer, AI coding assistant, dan kontributor lain pada proyek Bengkel POS & Monitoring. Semua implementasi harus tetap konsisten dengan `PRD.md`, `Architecture.md`, `Design.md`, dan `Schema.md`.

Jika ada konflik:

1. Business requirement di `PRD.md` memiliki prioritas tertinggi.
2. Integritas data di `Schema.md` tidak boleh dilanggar.
3. Keputusan arsitektur di `Architecture.md` diikuti kecuali ada perubahan yang terdokumentasi.
4. UI mengikuti `Design.md`.
5. `Rules.md` mengatur cara implementasi dan kontribusi.

Perubahan lintas dokumen harus dilakukan secara bersamaan agar tidak terjadi perbedaan definisi.

---

## 2. Scope Guardrails

MVP hanya mencakup fitur yang terdapat dalam PRD.

Jangan menambahkan tanpa keputusan eksplisit:

- role mekanik,
- booking online,
- multi-cabang,
- payroll,
- loyalty,
- accounting ledger penuh,
- supplier purchase order kompleks,
- WhatsApp automation,
- native mobile app.

Jika fitur baru diminta, update dokumen terkait sebelum atau bersamaan dengan implementasi.

---

## 3. Domain Rules yang Tidak Boleh Dilanggar

1. Role aplikasi hanya `ADMIN` dan `CASHIER`.
2. Mekanik adalah master data, bukan user.
3. Kasir tidak dapat melihat harga beli atau estimasi hasil usaha keseluruhan.
4. Kasir tidak dapat VOID transaksi PAID.
5. Admin dapat VOID transaksi PAID dengan alasan wajib.
6. Transaksi PAID/VOID tidak boleh hard delete.
7. Pemasukan berasal dari transaksi PAID, bukan input pemasukan manual.
8. Pengeluaran hanya dikelola Admin.
9. Setiap perubahan stok harus memiliki stock movement.
10. Checkout dan void harus atomik menggunakan database transaction.
11. Stock tidak boleh negatif akibat sale.
12. Sale item wajib menyimpan snapshot harga.
13. Dashboard dan report harus memakai rumus metric yang sama.

AI atau kontributor tidak boleh mengubah aturan tersebut hanya karena implementasi lain terasa lebih mudah.

---

## 4. Coding Conventions — General

- Gunakan bahasa Inggris untuk nama variable, function, class, endpoint, database column, dan enum.
- Gunakan bahasa Indonesia untuk teks UI pengguna jika target pengguna bengkel berbahasa Indonesia.
- Hindari singkatan yang tidak jelas.
- Satu function sebaiknya memiliki satu tanggung jawab utama.
- Hindari business logic besar di controller atau component UI.
- Jangan duplicate calculation logic antara frontend dan backend.
- Backend menjadi source of truth untuk aturan bisnis dan perhitungan final.
- Jangan hard-code role string di banyak tempat; gunakan enum/constant terpusat.
- Jangan hard-code payment method/status di banyak component; gunakan shared constant/type.

---

## 5. TypeScript / React Conventions

### Naming

- Component: `PascalCase`.
- Hook: prefix `use`.
- Function/variable: `camelCase`.
- Types/interfaces: `PascalCase`.
- File component: `PascalCase.tsx` atau pola yang dipilih proyek, tetapi harus konsisten.

### Component Rules

- Feature-specific component berada di `features/<domain>`.
- Generic UI component berada di `components/ui`.
- Jangan membuat satu component yang menangani data fetching, modal, table, business calculation, dan form kompleks sekaligus.
- Fetching/state server mengikuti satu pola yang konsisten di seluruh app.
- Permission UI hanya digunakan untuk UX; jangan menganggap route guard frontend sebagai security.

### Money

- Frontend hanya memformat Rupiah untuk tampilan.
- Jangan melakukan perhitungan finansial final dengan floating point yang dapat menimbulkan mismatch.
- Total final dari backend dianggap authoritative.

### Form

- Client-side validation untuk feedback cepat.
- Semua error backend harus dapat ditampilkan.
- Disable submit saat request berjalan untuk mencegah double submit.

---

## 6. Laravel/PHP Conventions

- Ikuti PSR coding standard dan formatter yang digunakan proyek.
- Controller tipis.
- Validation menggunakan Form Request atau validator terstruktur.
- Authorization menggunakan policy/gate/middleware backend.
- Business operation seperti checkout, void, dan stock adjustment berada pada service class.
- Query kompleks untuk dashboard/report dipisahkan dari controller.
- Gunakan enum/value object bila membantu konsistensi status.
- Gunakan database transaction untuk operasi multi-table kritis.
- Gunakan row lock untuk stok saat checkout jika ada risiko concurrent sale.
- Jangan menggunakan mass assignment tanpa whitelist/guard yang aman.

---

## 7. Database Rules

- Semua migration harus reversible jika memungkinkan.
- Gunakan foreign key untuk relasi utama.
- Tambahkan index untuk foreign key dan kolom pencarian/filter penting.
- Uang menggunakan `DECIMAL`.
- Quantity dan stok menggunakan `INTEGER` (jumlah tidak boleh fraksional).
- Jangan mengganti `current_stock` tanpa membuat `stock_movements` pada transaction yang sama.
- Jangan update manual data transaksi PAID untuk koreksi; gunakan domain action yang valid.
- Jangan menyimpan password, token, atau secret di audit log.
- Jangan mengubah snapshot harga sale item setelah PAID.

---

## 8. API Conventions

- Prefix versioned API, contoh `/api/v1`.
- Gunakan HTTP method sesuai fungsi.
- Response JSON konsisten.
- Validation error menggunakan status 422.
- Unauthenticated menggunakan 401.
- Unauthorized/forbidden menggunakan 403.
- Not found menggunakan 404.
- Business conflict dapat menggunakan 409 jika sesuai.
- Jangan mengirim stack trace ke client production.
- Endpoint sensitif harus melakukan authorization pada backend.

Contoh response success:

```json
{
  "data": {},
  "message": "Transaction paid successfully"
}
```

Contoh response error:

```json
{
  "message": "Stock is insufficient",
  "code": "INSUFFICIENT_STOCK",
  "errors": {}
}
```

---

## 9. Transaction and Inventory Safety Rules

### Checkout

Checkout wajib:

1. Validate sale masih DRAFT.
2. Load item.
3. Lock product rows yang dibutuhkan.
4. Validate stock cukup.
5. Calculate totals di backend.
6. Save price snapshots.
7. Update sale menjadi PAID.
8. Create SALE stock movement.
9. Update `products.current_stock`.
10. Commit.

Jika satu langkah gagal, rollback semuanya.

### Void

Void wajib:

1. User adalah Admin.
2. Sale status PAID.
3. Reason tidak kosong.
4. Lock resource yang diperlukan.
5. Mark sale VOID.
6. Create VOID_RETURN movement.
7. Restore stock.
8. Write audit log.
9. Commit.

Void harus idempotent secara bisnis: transaksi yang sudah VOID tidak boleh di-VOID lagi.

### Manual Stock Adjustment (Atur Stok)

Input Atur Stok adalah **delta/jumlah perubahan bertanda**, bukan nilai stok absolut:

- `stock_after = stock_before + change`.
- Semua jumlah stok adalah bilangan bulat (`INTEGER`); pecahan ditolak.
- `change = 0` ditolak; hasil `stock_after < 0` ditolak; note wajib.
- `PURCHASE` (stok masuk/restock) → `change > 0`; hanya mencatat perubahan stok.
- `ADJUSTMENT` (opname/selisih/koreksi, bertanda +/-) dan `OPENING` juga hanya mencatat perubahan stok.
- Transaksi: lock baris produk → update stok → simpan `StockMovement` → commit. Gagal di langkah mana pun → rollback semuanya.
- Atur Stok **tidak pernah** membuat `Expense` otomatis. Pengeluaran hanya dicatat manual oleh Admin melalui Manajemen Pengeluaran.
- Expense legacy `STOCK_PURCHASE` yang sudah ada tetap menjadi histori dan tetap tidak dapat diedit manual.

---

## 10. Authorization Matrix

| Capability | Admin | Kasir |
|---|:---:|:---:|
| Dashboard bisnis penuh | Yes | No |
| Create POS sale | Yes | Yes |
| Edit DRAFT sale | Yes | Yes |
| Checkout sale | Yes | Yes |
| Void PAID sale | Yes | No |
| View purchase price | Yes | No |
| Manage products | Yes | No |
| Adjust stock | Yes | Yes |
| View stock quantity in POS | Yes | Yes |
| Manage service catalog | Yes | No |
| Create/update service order | Yes | Yes |
| Select mechanic | Yes | Yes |
| Manage mechanic master | Yes | No |
| Manage customers | Yes | Yes |
| Manage expenses | Yes | No |
| View financial result | Yes | No |
| Export reports | Yes | No |
| Manage cashier users | Yes | No |
| View audit log | Yes | No |

Jika implementasi permission berbeda dari tabel ini, dokumen harus diperbarui terlebih dahulu.

> **Kecuali harga beli untuk konteks Atur Stok:** Kasir dapat melihat `purchase_price` **hanya** di halaman Produk & Stok karena daftar produk dikirim dengan `?include_cost=1`. POS/catalog tidak mengirim flag ini, sehingga harga beli tetap tersembunyi di alur penjualan (security.md A9).

---

## 11. UI/UX Rules

- UI menggunakan terminology yang sama di semua halaman.
- Jangan menampilkan `profit` sebagai angka pasti; gunakan istilah `Estimasi Hasil Usaha` sesuai definisi PRD kecuali model akuntansi diperluas.
- Status harus memiliki text label, bukan hanya warna.
- Destructive action wajib confirmation dialog.
- Void wajib input alasan.
- Tombol yang user tidak punya izin boleh disembunyikan, tetapi backend tetap memblokir akses.
- Dashboard mobile harus tetap menjadi first-class experience.
- Jangan menambahkan chart hanya sebagai dekorasi jika tidak membantu keputusan.
- Judul & deskripsi halaman (H1 + P) hanya dirender di topbar sticky (sumber: `PAGE_META` di `AppShell`); konten tidak menampilkan H1/P ulang. Tombol aksi halaman berada di bar aksi kanan-atas konten.

---

## 12. Naming Rules

Gunakan vocabulary berikut secara konsisten:

- `Sale` = transaksi POS.
- `Sale Item` = item produk/jasa pada transaksi.
- `Service Order` = pekerjaan servis kendaraan.
- `Product` = sparepart/barang dengan stok.
- `Service` = jasa servis tanpa stok.
- `Stock Movement` = histori perubahan stok.
- `Expense` = pengeluaran.
- `Mechanic` = master mekanik tanpa akun.
- `Admin` = pemilik/pengelola dengan akses penuh.
- `Cashier` = pengguna operasional kasir.
- `Void` = pembatalan transaksi PAID tanpa menghapus histori.

Jangan menggunakan istilah lain untuk entitas yang sama tanpa alasan kuat.

---

## 13. Testing Rules

Setiap perubahan pada domain kritis wajib memiliki test yang relevan.

Minimum tests yang tidak boleh hilang:

- cashier checkout success,
- insufficient stock rejected,
- concurrent stock protection bila diterapkan,
- rollback on checkout failure,
- cashier cannot void paid sale,
- admin can void paid sale,
- void restores stock once,
- paid sale snapshot stays unchanged after master update,
- report totals match paid sales,
- cashier cannot access purchase price/admin endpoints,
- restock records stock movement without creating expense,
- adjustment/opname never touches expenses,
- legacy `STOCK_PURCHASE` expenses remain locked from manual edit.

Bug yang menyangkut uang, stok, role, atau audit wajib memiliki regression test saat diperbaiki.

---

## 14. Logging Rules

Application log dan audit log dibedakan.

### Application Log

Untuk:

- exception,
- integration failure,
- server error,
- operational debugging.

### Audit Log

Untuk:

- perubahan harga,
- stock adjustment,
- checkout,
- void,
- expense changes,
- user changes.

Jangan menyimpan credential, password, token, atau data rahasia pada log.

---

## 15. AI Contributor Rules

AI boleh membantu:

- membuat boilerplate,
- membuat migration berdasarkan `Schema.md`,
- membuat component berdasarkan `Design.md`,
- membuat endpoint berdasarkan `Architecture.md`,
- membuat test,
- refactor dengan perilaku yang sama,
- dokumentasi.

AI tidak boleh tanpa instruksi eksplisit:

1. Menambah role baru.
2. Menambah tabel pemasukan manual.
3. Mengubah formula `Estimated Operating Result`.
4. Mengizinkan Kasir VOID PAID sale.
5. Menghapus audit requirement.
6. Menghapus stock movement ledger.
7. Mengganti relational database dengan NoSQL.
8. Memecah backend menjadi microservices.
9. Mengubah schema penting hanya karena lebih mudah di-code.
10. Menambahkan fitur di luar scope MVP.
11. Mengarang aturan bisnis yang tidak ada pada lima dokumen.
12. Menyimpan secret/API key dalam source code.

Jika requirement tidak jelas, AI harus memilih implementasi paling konservatif yang tidak mengubah business rules dan meninggalkan catatan `TODO/decision needed` bila benar-benar diperlukan.

---

## 16. Contributor Change Protocol

Untuk perubahan kecil yang tidak mengubah requirement, cukup update code + test.

Untuk perubahan yang memengaruhi business flow/schema/API:

1. Update `PRD.md` jika requirement berubah.
2. Update `Architecture.md` jika boundary/flow teknis berubah.
3. Update `Design.md` jika user flow/UI berubah.
4. Update `Schema.md` jika database berubah.
5. Update `Rules.md` jika convention/guardrail berubah.
6. Implementasi code.
7. Tambahkan/update test.

Tidak boleh merge perubahan yang membuat kelima dokumen saling bertentangan.

---

## 17. Pull Request Checklist

Sebelum merge:

- [ ] Scope sesuai PRD.
- [ ] Tidak menambah role mekanik.
- [ ] Permission backend benar.
- [ ] Migration dan schema konsisten.
- [ ] Tidak ada hard delete pada histori kritis.
- [ ] Money menggunakan decimal.
- [ ] Checkout/void transaction-safe.
- [ ] Stock movement dibuat untuk semua perubahan stok.
- [ ] UI tidak membocorkan data Admin ke Kasir.
- [ ] Test kritis lulus.
- [ ] Error handling jelas.
- [ ] Audit log tersedia untuk aksi sensitif.
- [ ] Dokumentasi diperbarui jika ada perubahan kontrak.

---

## 18. Final Consistency Checklist

Sebelum release, pastikan fakta berikut sama di seluruh dokumen dan code:

- Role: ADMIN dan CASHIER saja.
- Mechanic: master data, tanpa login.
- Sale status: DRAFT, PAID, VOID.
- Service order status: UI memakai OPEN ("Baru") dan DONE ("Selesai"); IN_PROGRESS/CANCELLED dormant (legacy). Order baru default OPEN; DONE hanya dicapai otomatis saat checkout yang ditautkan dibayar (update endpoint menolak DONE manual). Status terminal (DONE/CANCELLED) tidak pernah ditimpa checkout.
- Service order delete: diizinkan di semua status; bila order punya sale, transaksi tetap tersimpan dan `sale.service_order_id` dikosongkan (audit `SERVICE_ORDER_DELETED` + `sale_unlinked`). UI: tombol Hapus tampil di semua status; tombol Lihat Detail hanya untuk status Selesai (DONE).
- Paid sale hanya dapat di-void Admin.
- Revenue berasal dari sale PAID.
- Expense disimpan terpisah.
- Product sale mengurangi stok.
- Void mengembalikan stok.
- Stock tidak boleh negatif.
- Paid item menggunakan snapshot harga.
- Estimasi hasil usaha = Revenue - Product COGS - Recorded Expenses.
- Dashboard dan report menggunakan definisi metric yang sama.
