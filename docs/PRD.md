# PRD.md — Product Requirements Document

## 1. Ringkasan Produk

**Nama kerja produk:** Bengkel POS & Monitoring

Bengkel POS & Monitoring adalah aplikasi web responsif untuk membantu bengkel motor yang saat ini masih melakukan pencatatan transaksi, servis, stok, pemasukan, dan pengeluaran secara manual. Sistem dirancang terutama untuk dua kebutuhan: mempermudah pekerjaan kasir di bengkel dan memberikan visibilitas kepada pemilik/admin yang tidak selalu berada di lokasi.

Sistem hanya memiliki dua role aplikasi, yaitu **Admin** dan **Kasir**. Mekanik **tidak memiliki akun** agar tidak menambah beban administrasi. Nama mekanik tetap disimpan sebagai master data sehingga kasir dapat memilih mekanik yang mengerjakan suatu servis dan admin tetap dapat melihat aktivitas servis per mekanik.

---

## 2. Masalah yang Ingin Diselesaikan

Kondisi awal bengkel masih bergantung pada pencatatan manual. Kondisi tersebut menimbulkan beberapa risiko utama:

1. Transaksi penjualan jasa dan sparepart sulit direkap secara cepat.
2. Pemilik tidak dapat melihat omzet, jumlah transaksi, servis, pengeluaran, dan kondisi stok secara real-time ketika tidak berada di bengkel.
3. Stok sparepart berisiko tidak sinkron dengan penjualan karena pengurangan stok dilakukan manual.
4. Riwayat servis pelanggan sulit ditelusuri kembali.
5. Pemasukan dan pengeluaran berpotensi tercampur atau tidak tercatat secara konsisten.
6. Transaksi yang dibatalkan atau diubah sulit diaudit jika hanya menggunakan catatan manual.
7. Mekanik sebaiknya tidak dibebani akun sistem karena fokus utamanya adalah pekerjaan teknis.

---

## 3. Goals

Produk ini memiliki tujuan utama berikut:

- Memindahkan pencatatan transaksi bengkel dari proses manual ke sistem POS terpusat.
- Membuat stok sparepart otomatis berkurang ketika transaksi dibayar dan kembali ketika transaksi di-void oleh Admin.
- Memberikan dashboard pemilik yang menampilkan kondisi bengkel secara ringkas dan mudah dipantau dari perangkat desktop maupun mobile.
- Menyediakan riwayat servis berdasarkan pelanggan.
- Memisahkan data penjualan/pemasukan dari pengeluaran sehingga pemilik dapat melakukan evaluasi usaha dengan data yang lebih jelas.
- Menyediakan laporan penjualan, servis, stok, dan keuangan berdasarkan periode.
- Menyimpan jejak aktivitas penting untuk membantu pengawasan terhadap transaksi dan perubahan data.
- Menjaga alur kerja kasir tetap sederhana dan tidak memerlukan interaksi sistem dari mekanik.

---

## 4. Non-Goals / Di Luar Scope MVP

Fitur berikut tidak menjadi bagian MVP agar sistem tetap fokus dan tidak membebani operasional awal bengkel:

- Akun atau dashboard mekanik.
- Booking servis online oleh pelanggan.
- Aplikasi mobile native Android/iOS.
- Multi-cabang.
- Payroll/gaji otomatis.
- Akuntansi double-entry/general ledger lengkap.
- Purchase order dan approval supplier yang kompleks.
- CRM loyalty point/member reward.
- Integrasi WhatsApp otomatis.
- Integrasi marketplace.
- Integrasi pajak/e-faktur.
- Penjadwalan shift pegawai.

Fitur tersebut dapat dipertimbangkan setelah MVP stabil dan memang dibutuhkan oleh operasional bengkel.

---

## 5. Pengguna dan Hak Akses

### 5.1 Admin

Admin merepresentasikan pemilik atau pengelola utama bengkel. Admin memiliki akses penuh untuk:

- Melihat seluruh dashboard dan laporan.
- Melihat semua transaksi.
- Membatalkan/void transaksi yang sudah dibayar dengan alasan wajib.
- Mengelola produk/sparepart, jasa servis, harga, stok minimum, dan stok masuk/penyesuaian.
- Mengelola data pelanggan dan mekanik.
- Melihat harga beli dan estimasi hasil usaha.
- Mencatat dan mengelola pengeluaran.
- Mengelola akun Kasir.
- Melihat audit log.
- Mengakses ekspor laporan.

### 5.2 Kasir

Kasir bertanggung jawab terhadap pencatatan kegiatan operasional dan memiliki akses untuk:

- Membuat transaksi POS.
- Menambahkan jasa servis dan sparepart ke transaksi.
- Mencatat pelanggan.
- Membuat dan memperbarui order servis.
- Memilih nama mekanik yang mengerjakan servis.
- Menyelesaikan pembayaran.
- Mencetak atau menampilkan nota.
- Melihat riwayat transaksi yang diperlukan untuk pelayanan.
- Melihat stok tersedia untuk kebutuhan transaksi.

Kasir tidak dapat:

- Melihat harga beli produk.
- Melihat estimasi laba/hasil usaha keseluruhan.
- Mengubah harga master secara bebas.
- Melakukan penyesuaian stok.
- Mengelola akun pengguna.
- Menghapus data transaksi secara permanen.
- Melakukan void transaksi berstatus PAID.
- Melihat audit log penuh.

---

## 6. Scope MVP

### 6.1 Authentication & Role-Based Access Control

Sistem menyediakan login untuk Admin dan Kasir. Setiap endpoint dan halaman harus memeriksa hak akses pengguna. Pengguna yang dinonaktifkan oleh Admin tidak dapat login.

### 6.2 Dashboard Admin

Dashboard berfungsi sebagai halaman monitoring utama pemilik. Data minimal yang ditampilkan:

- Omzet transaksi berstatus PAID hari ini.
- Omzet bulan berjalan.
- Jumlah transaksi hari ini.
- Jumlah order servis hari ini.
- Nilai pengeluaran hari ini dan bulan berjalan.
- Estimasi hasil usaha periode terpilih.
- Grafik omzet berdasarkan hari untuk periode terpilih.
- Produk/sparepart terlaris.
- Jasa servis yang paling sering terjual.
- Daftar stok yang berada pada atau di bawah batas minimum.
- Ringkasan transaksi yang di-void.

**Definisi estimasi hasil usaha MVP:**

`Penjualan bersih - harga beli snapshot produk yang terjual - pengeluaran tercatat`

Angka ini bersifat estimasi karena hanya seakurat data harga beli dan pengeluaran yang dimasukkan ke sistem. Jika biaya tertentu tidak dicatat, hasil tidak merepresentasikan laba akuntansi resmi.

### 6.3 POS / Transaksi Penjualan

Kasir dapat membuat transaksi yang berisi:

- Sparepart/produk.
- Jasa servis.
- Kuantitas.
- Harga jual yang berasal dari master pada saat item ditambahkan.
- Diskon transaksi jika kebijakan bengkel mengizinkan.
- Pelanggan, bersifat opsional untuk penjualan sparepart biasa.
- Order servis, jika transaksi merupakan penyelesaian servis.
- Metode pembayaran: tunai, transfer, QRIS, atau metode lain yang dikonfigurasi sistem.

Alur transaksi:

1. Kasir membuat transaksi DRAFT.
2. Kasir menambahkan item.
3. Sistem menghitung subtotal, diskon, dan total.
4. Kasir memilih metode pembayaran dan menyelesaikan pembayaran.
5. Dalam satu transaksi database yang atomik, sistem mengubah status menjadi PAID, mencatat pembayaran, menyimpan snapshot harga, dan mengurangi stok produk.
6. Transaksi PAID tidak dapat diedit oleh Kasir.
7. Jika perlu dibatalkan setelah PAID, hanya Admin yang dapat melakukan VOID dengan alasan wajib. Sistem mengembalikan stok produk secara otomatis melalui stock movement kebalikan dan menyimpan audit log.

### 6.4 Manajemen Servis

Kasir dapat membuat order servis yang berisi:

- Pelanggan.
- Kendaraan.
- Nomor polisi.
- Odometer saat datang, jika diketahui.
- Keluhan pelanggan.
- Mekanik yang mengerjakan, dipilih dari master mekanik.
- Catatan hasil/diagnosis sederhana, jika diperlukan.
- Status servis: UI hanya memakai **"Baru"** (OPEN) dan **"Selesai"** (DONE). Status lain di DB (IN_PROGRESS/CANCELLED) dormant untuk data lama.
- Waktu mulai dan selesai.

Mekanik tidak login ke sistem. Order baru otomatis "Baru"; saat transaksi POS dibayar, order otomatis menjadi **Selesai** (DONE). Tidak ada tombol "Selesai" manual. Tombol **Hapus** tersedia di semua status (order dengan transaksi tetap bisa dihapus, transaksi/nota tetap tersimpan); tombol **Lihat Detail** tampil untuk order berstatus Selesai; **Edit** hanya untuk order belum terminal.

Saat servis selesai, Kasir dapat membuat transaksi POS yang dikaitkan dengan order servis tersebut. Sparepart dan jasa yang ditagihkan disimpan pada transaksi POS sehingga tidak ada pencatatan pendapatan ganda.

### 6.5 Master Pelanggan

Sistem menyimpan data dasar pelanggan agar riwayat servis dapat dicari kembali.

Data pelanggan minimal:

- Nama.
- Nomor telepon, opsional.

### 6.6 Master Mekanik

Mekanik disimpan sebagai master data tanpa akun login.

Data minimal:

- Nama.
- Nomor telepon, opsional.
- Status aktif/nonaktif.

Data ini digunakan pada order servis dan laporan operasional, bukan untuk memberikan akses aplikasi kepada mekanik.

### 6.7 Produk/Sparepart dan Stok

Admin dapat mengelola:

- SKU/kode produk.
- Nama produk.
- Kategori.
- Merek.
- Satuan.
- Harga beli.
- Harga jual.
- Stok saat ini.
- Batas stok minimum.
- Status aktif/nonaktif.

Setiap perubahan stok harus menghasilkan `stock_movements` dan tidak boleh mengubah angka stok tanpa jejak.

Jenis pergerakan stok MVP:

- OPENING: stok awal.
- PURCHASE: penambahan stok dari pembelian/restock.
- SALE: pengurangan akibat transaksi PAID.
- ADJUSTMENT: koreksi stok oleh Admin dengan alasan.
- VOID_RETURN: pengembalian stok akibat transaksi VOID.

Sistem tidak mengizinkan transaksi PAID menghasilkan stok negatif. Jika stok tidak cukup, pembayaran harus ditolak sampai kuantitas diperbaiki atau Admin menyesuaikan stok.

### 6.8 Master Jasa Servis

Admin dapat mengelola daftar jasa servis dengan data minimal:

- Kode jasa.
- Nama jasa.
- Harga jual standar.
- Status aktif/nonaktif.

Jasa tidak memengaruhi stok.

### 6.9 Pengeluaran

Admin dapat mencatat pengeluaran operasional yang terdiri dari:

- Tanggal.
- Kategori.
- Nominal.
- Deskripsi/catatan.
- Pengguna yang mencatat.

Pemasukan tidak dicatat ulang melalui tabel pemasukan manual. Pemasukan berasal dari transaksi POS berstatus PAID agar tidak terjadi double counting.

### 6.10 Laporan

Admin dapat memfilter laporan berdasarkan tanggal. Laporan minimum:

1. **Laporan Penjualan**
   - Jumlah transaksi.
   - Omzet.
   - Diskon.
   - Penjualan sparepart.
   - Penjualan jasa.
   - Metode pembayaran.
   - Void.

2. **Laporan Servis**
   - Jumlah order servis.
   - Status order.
   - Jasa yang paling sering terjual.
   - Aktivitas servis berdasarkan mekanik yang dipilih Kasir.

3. **Laporan Stok**
   - Stok saat ini.
   - Produk di bawah stok minimum.
   - Pergerakan stok.
   - Produk terlaris.

4. **Laporan Keuangan Sederhana**
   - Penjualan bersih.
   - COGS produk berdasarkan `purchase_price_snapshot` pada sale item.
   - Pengeluaran tercatat.
   - Estimasi hasil usaha.

Laporan dapat diekspor ke format spreadsheet dan PDF sebagai output administrasi.

### 6.11 Audit Log

Aktivitas sensitif harus memiliki audit log, minimal:

- Login berhasil/gagal jika dibutuhkan untuk keamanan.
- Pembuatan dan perubahan master data penting.
- Perubahan harga jual/harga beli.
- Penyesuaian stok.
- Penyelesaian transaksi.
- Void transaksi.
- Pencatatan/perubahan pengeluaran.
- Perubahan akun pengguna.

Audit log harus menyimpan pengguna, jenis aksi, entitas, waktu, serta data sebelum/sesudah jika relevan.

---

## 7. Business Rules Utama

1. Hanya ada role `ADMIN` dan `CASHIER`.
2. Mekanik bukan user; mekanik hanya master data.
3. Transaksi DRAFT dapat diubah oleh Kasir yang memiliki akses transaksi.
4. Transaksi PAID bersifat immutable bagi Kasir.
5. Hanya Admin yang dapat melakukan VOID transaksi PAID.
6. VOID wajib memiliki alasan.
7. Transaksi VOID tidak dihapus dari database.
8. Penjualan PAID mengurangi stok secara atomik.
9. VOID mengembalikan stok secara atomik.
10. Stok tidak boleh menjadi negatif akibat penjualan.
11. Harga jual dan harga beli yang digunakan pada transaksi harus disimpan sebagai snapshot agar laporan historis tidak berubah ketika harga master berubah.
12. Pemasukan dihitung dari transaksi PAID, bukan input pemasukan manual.
13. Pengeluaran dicatat terpisah dan hanya dapat dikelola Admin.
14. Semua nilai uang disimpan menggunakan tipe desimal, bukan floating-point.
15. Seluruh timestamp disimpan secara konsisten dan ditampilkan ke pengguna dalam zona waktu operasional bengkel.

---

## 8. Technical Requirements

### 8.1 Arsitektur

- Web application dengan frontend SPA dan backend REST API.
- Frontend: React + TypeScript + Vite + Tailwind CSS.
- Backend: Laravel REST API.
- Database: MySQL 8 atau versi MySQL kompatibel yang mendukung foreign key, transaction, index, dan CHECK constraint yang digunakan proyek.
- Authentication: session/token authentication yang aman untuk SPA dengan mekanisme resmi Laravel.
- API menggunakan JSON.
- Database operation kritis seperti penyelesaian transaksi, pengurangan stok, dan void harus menggunakan database transaction.

### 8.2 Security

- Password disimpan menggunakan password hashing bawaan framework.
- Authorization diperiksa di backend, bukan hanya menyembunyikan tombol di frontend.
- Endpoint Admin tidak dapat diakses Kasir.
- Input harus divalidasi di backend.
- Audit log tidak dapat diedit melalui UI biasa.
- Tidak menyimpan data kartu pembayaran karena sistem hanya mencatat metode pembayaran, bukan memproses kartu.

### 8.3 Reliability

- Penyelesaian transaksi harus atomik: jika penyimpanan pembayaran atau pengurangan stok gagal, seluruh operasi harus rollback.
- Index harus tersedia pada kolom pencarian/filter penting seperti kode transaksi, tanggal, status, SKU, customer phone, dan foreign key.
- Data transaksi dan stock movement tidak boleh hard delete melalui operasi normal aplikasi.

### 8.4 Responsiveness

- Dashboard Admin wajib nyaman digunakan pada mobile karena pemilik sering memantau dari luar bengkel.
- Halaman POS dioptimalkan untuk desktop/tablet tetapi tetap dapat digunakan di mobile.

### 8.5 Backup dan Recovery

- Database produksi harus memiliki backup terjadwal sesuai kemampuan hosting.
- Prosedur restore perlu diuji sebelum sistem digunakan sebagai satu-satunya sumber pencatatan bisnis.

---

## 9. Success Metrics / Acceptance Metrics MVP

Success metrics pada tahap MVP difokuskan pada keberhasilan proses sistem, bukan target omzet bisnis yang belum memiliki baseline.

### 9.1 Operasional

- Setiap transaksi yang selesai memiliki nomor transaksi unik, kasir, timestamp, item, total, dan metode pembayaran.
- Setiap transaksi PAID yang berisi sparepart menghasilkan stock movement SALE yang sesuai.
- Setiap transaksi VOID menghasilkan stock movement pengembalian yang sesuai.
- Sistem menolak pembayaran jika stok produk yang diperlukan tidak mencukupi.
- Transaksi PAID tidak dapat diedit oleh Kasir.
- Admin dapat melihat transaksi dan kondisi stok dari perangkat lain setelah data tersimpan.

### 9.2 Monitoring Pemilik

- Dashboard dapat menampilkan omzet, transaksi, order servis, pengeluaran, stok minimum, dan grafik berdasarkan data sistem.
- Total omzet dashboard untuk periode yang sama harus sama dengan total transaksi PAID dikurangi transaksi VOID pada laporan penjualan.
- Estimasi hasil usaha harus menggunakan formula yang sama pada dashboard dan laporan keuangan.

### 9.3 Auditability

- Void transaksi, penyesuaian stok, perubahan harga, dan perubahan pengguna memiliki audit trail.
- Tidak ada hard delete untuk transaksi PAID, transaksi VOID, dan stock movement melalui UI aplikasi.

### 9.4 Usability

- Kasir dapat menyelesaikan alur dasar `buat transaksi -> tambah item -> pilih pembayaran -> bayar -> lihat nota` tanpa memerlukan akses Admin.
- Mekanik dapat tetap bekerja tanpa akun aplikasi.
- Admin dapat melakukan monitoring utama melalui tampilan mobile responsif.

---

## 10. Definition of Done MVP

MVP dianggap siap digunakan ketika:

1. Login dan RBAC Admin/Kasir berjalan.
2. Master produk, jasa, pelanggan, dan mekanik dapat digunakan.
3. POS mampu membuat transaksi produk, jasa, atau kombinasi keduanya.
4. Pembayaran dan perubahan stok berjalan atomik.
5. Order servis dapat dibuat dan dikaitkan dengan transaksi.
6. Pengeluaran dapat dicatat oleh Admin.
7. Dashboard dan seluruh laporan menggunakan data yang konsisten.
8. Transaksi PAID tidak dapat dimodifikasi Kasir.
9. Void Admin mengembalikan stok dan tercatat dalam audit log.
10. Pengujian kritis untuk transaksi, stok, role, dan laporan lulus.
