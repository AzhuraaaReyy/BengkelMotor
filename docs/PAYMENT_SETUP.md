# 🚀 Panduan Setup Payment Gateway - Midtrans

Dokumentasi lengkap untuk setup integrasi pembayaran QRIS dan Virtual Account menggunakan Midtrans.

---

## 📋 Daftar Isi

1. [Mode Pembayaran](#mode-pembayaran)
2. [Setup Simulasi (Development)](#setup-simulasi-development)
3. [Setup Midtrans Real (Production)](#setup-midtrans-real-production)
4. [Testing & Troubleshooting](#testing--troubleshooting)
5. [Webhook Configuration](#webhook-configuration)

---

## 🔧 Mode Pembayaran

Sistem ini mendukung 2 mode pembayaran:

### 1. **Simulasi Mode (FakePaymentGateway)**
- ✅ Untuk development dan testing
- ✅ Tidak perlu API Key Midtrans
- ✅ QR Code di-generate dengan format EMVCo (bisa discan)
- ✅ VA Number hardcoded: `1234567890`
- ✅ Tombol "Simulasi Bayar (Dev)" untuk testing instant payment

### 2. **Real Gateway Mode (MidtransGateway)**
- ✅ Untuk production atau testing dengan sandbox Midtrans
- ✅ Butuh API Key dari Midtrans
- ✅ QR Code dan VA real dari Midtrans
- ✅ Webhook untuk notifikasi pembayaran otomatis

---

## 🧪 Setup Simulasi (Development)

### Langkah-langkah:

1. **Pastikan `.env` kosong untuk Midtrans**
   ```env
   MIDTRANS_SERVER_KEY=
   MIDTRANS_CLIENT_KEY=
   MIDTRANS_IS_PRODUCTION=false
   ```

2. **Sistem otomatis menggunakan FakePaymentGateway**
   - Backend akan detect `MIDTRANS_SERVER_KEY` kosong
   - Otomatis inject `FakePaymentGateway` di `AppServiceProvider`

3. **Cara Testing:**
   
   **A. Pembayaran CASH:**
   - Pilih metode CASH
   - Input jumlah uang dibayarkan
   - Klik "Konfirmasi Pembayaran"
   - ✅ Langsung redirect ke struk

   **B. Pembayaran QRIS (Simulasi):**
   - Pilih metode QRIS
   - Klik "Proses Pembayaran"
   - QR Code akan muncul (EMVCo format - bisa discan!)
   - Countdown timer 5 menit dimulai
   - **Untuk simulasi:** Klik tombol "Simulasi Bayar (Dev)"
   - Modal sukses muncul → klik "Cetak Struk"
   - ✅ Auto-trigger print dialog

   **C. Pembayaran VA (Simulasi):**
   - Pilih metode VA
   - Klik "Proses Pembayaran"
   - VA Number `1234567890` akan muncul
   - Countdown timer 5 menit dimulai
   - **Untuk simulasi:** Klik tombol "Simulasi Bayar (Dev)"
   - Modal sukses muncul → klik "Cetak Struk"
   - ✅ Auto-trigger print dialog

4. **Fitur Tambahan:**
   - ✅ Copy VA Number dengan 1 klik
   - ✅ Countdown timer dengan progress bar
   - ✅ Polling status setiap 5 detik
   - ✅ Handling expired → tombol "Coba Lagi"
   - ✅ Modal bisa ditutup, pembayaran tetap berjalan

---

## 🌐 Setup Midtrans Real (Production)

### 1️⃣ Daftar Akun Midtrans

1. Kunjungi: [https://dashboard.midtrans.com/](https://dashboard.midtrans.com/)
2. Klik **"Sign Up"** atau **"Register"**
3. Isi form registrasi:
   - Nama lengkap
   - Email
   - Password
   - Nomor telepon
4. Verifikasi email Anda
5. Login ke dashboard

### 2️⃣ Dapatkan API Keys (Sandbox)

1. Di dashboard Midtrans, pilih **"Sandbox"** (pojok kanan atas)
2. Navigasi ke: **Settings** → **Access Keys**
3. Copy:
   - **Server Key** (contoh: `SB-Mid-server-xxxxxxxxxxxxx`)
   - **Client Key** (contoh: `SB-Mid-client-xxxxxxxxxxxxx`)

### 3️⃣ Konfigurasi Backend (.env)

Edit file `backend/.env`:

```env
# =========================================================================
# PAYMENT GATEWAY - MIDTRANS SANDBOX
# =========================================================================
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
```

### 4️⃣ Setup Webhook URL

Webhook digunakan untuk menerima notifikasi pembayaran secara real-time dari Midtrans.

#### A. Setup di Midtrans Dashboard:

1. Login ke Midtrans Dashboard
2. Pilih **Sandbox** mode
3. Navigasi ke: **Settings** → **Configuration**
4. Scroll ke bagian **"Notification URL"** / **"Webhook URL"**
5. Input URL webhook Anda:
   ```
   https://your-domain.com/api/v1/payments/webhook/midtrans
   ```
   
   Contoh:
   - Production: `https://bengkel.com/api/v1/payments/webhook/midtrans`
   - Staging: `https://staging.bengkel.com/api/v1/payments/webhook/midtrans`
   - Ngrok (local dev): `https://abc123.ngrok.io/api/v1/payments/webhook/midtrans`

6. Centang **"HTTP Notification"**
7. Klik **"Save"**

#### B. Testing Webhook Locally (dengan Ngrok):

Jika ingin testing webhook di local development:

1. Install Ngrok: [https://ngrok.com/download](https://ngrok.com/download)
2. Jalankan backend Laravel di port 8000:
   ```bash
   php artisan serve
   ```
3. Di terminal baru, jalankan Ngrok:
   ```bash
   ngrok http 8000
   ```
4. Copy URL yang digenerate (contoh: `https://abc123.ngrok.io`)
5. Masukkan ke Midtrans webhook: `https://abc123.ngrok.io/api/v1/payments/webhook/midtrans`

### 5️⃣ Restart Backend

Setelah setup `.env`:

```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan serve
```

### 6️⃣ Testing dengan Midtrans Sandbox

1. **Buat transaksi QRIS/VA** di aplikasi
2. Midtrans akan generate QR Code / VA Number real
3. Gunakan **Simulator Midtrans** untuk testing:
   - Login ke Dashboard Midtrans
   - Navigasi ke: **Transactions** → **Simulator**
   - Pilih transaksi yang ingin di-simulate
   - Klik **"Pay"** untuk simulate successful payment
   - Webhook akan otomatis trigger
   - Sistem akan update status → PAID
   - Modal sukses muncul di frontend

---

## 🔐 Production Mode Setup

Setelah testing berhasil di Sandbox, untuk production:

### 1️⃣ Dapatkan Production Keys

1. Di Midtrans Dashboard, switch ke **"Production"** (pojok kanan atas)
2. Navigasi ke: **Settings** → **Access Keys**
3. Copy Production Server Key & Client Key

### 2️⃣ Update .env

```env
# =========================================================================
# PAYMENT GATEWAY - MIDTRANS PRODUCTION
# =========================================================================
MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=true
```

### 3️⃣ Update Webhook URL (Production)

1. Switch ke **Production** mode di Midtrans Dashboard
2. Settings → Configuration → Notification URL
3. Input production webhook URL:
   ```
   https://your-production-domain.com/api/v1/payments/webhook/midtrans
   ```

### 4️⃣ Restart & Deploy

```bash
php artisan config:clear
php artisan cache:clear
```

---

## 🧪 Testing & Troubleshooting

### Test Checklist:

#### ✅ CASH Payment
- [ ] Input jumlah uang
- [ ] Kembalian dihitung otomatis
- [ ] Klik konfirmasi → langsung ke struk
- [ ] Print dialog muncul

#### ✅ QRIS Payment (Simulasi)
- [ ] QR Code muncul setelah checkout
- [ ] QR Code bisa discan (EMVCo format)
- [ ] Countdown timer berjalan (5 menit)
- [ ] Tombol "Simulasi Bayar" work
- [ ] Modal sukses muncul
- [ ] Cetak struk work
- [ ] Auto-print trigger

#### ✅ VA Payment (Simulasi)
- [ ] VA Number muncul
- [ ] Copy VA button work
- [ ] Countdown timer berjalan
- [ ] Tombol "Simulasi Bayar" work
- [ ] Modal sukses muncul
- [ ] Cetak struk work

#### ✅ QRIS/VA Real (Midtrans Sandbox)
- [ ] QR Code dari Midtrans muncul
- [ ] VA Number dari Midtrans muncul
- [ ] Simulator Midtrans work
- [ ] Webhook diterima backend
- [ ] Status update otomatis
- [ ] Frontend polling detect status PAID
- [ ] Modal sukses muncul

#### ✅ Expired Flow
- [ ] Tunggu 5 menit atau force expire
- [ ] Status berubah EXPIRED
- [ ] Pesan "Kedaluwarsa" muncul
- [ ] Tombol "Coba Lagi" work
- [ ] Tombol "Tutup" work

### Common Issues:

#### 1. **QR Code tidak muncul**
**Problem:** Blank atau error di QR Code area

**Solution:**
```bash
# Check console browser
# Pastikan gateway_qr_string atau gateway_qr_url ada di response API
curl http://localhost:8000/api/v1/sales/{sale_id} | jq
```

#### 2. **Webhook tidak diterima**
**Problem:** Status pembayaran tidak update otomatis

**Solution:**
- Cek webhook URL di Midtrans Dashboard sudah benar
- Test webhook dengan Postman:
  ```bash
  POST http://your-domain.com/api/v1/payments/webhook/midtrans
  Headers: X-Signature: test
  Body: {
    "order_id": "SALE-001",
    "transaction_status": "settlement",
    "gross_amount": "100000",
    "transaction_id": "TX-123"
  }
  ```
- Cek Laravel logs: `storage/logs/laravel.log`

#### 3. **Polling tidak work**
**Problem:** Frontend tidak detect status berubah

**Solution:**
- Cek network tab browser → request GET `/api/v1/sales/{id}` setiap 5 detik
- Cek response API apakah status sudah PAID
- Pastikan tidak ada error CORS

#### 4. **Auto-print tidak trigger**
**Problem:** Print dialog tidak muncul otomatis

**Solution:**
- Cek URL bar → harus ada `?autoprint=true`
- Browser mungkin block popup → allow popup
- Cek console error

---

## 🔒 Security Notes

### Production Checklist:

- [ ] **HTTPS wajib** untuk webhook URL
- [ ] Jangan commit `.env` ke git
- [ ] Simpan API Keys di environment variables (server)
- [ ] Enable webhook signature verification (sudah implemented)
- [ ] Rate limiting sudah aktif (30 req/menit)
- [ ] CORS configuration sudah benar
- [ ] Monitor Laravel logs untuk suspicious activities

---

## 📊 Flow Diagram

```
┌─────────────┐
│   User      │
│  Checkout   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Pilih Metode:                           │
│  • CASH → Langsung PAID                  │
│  • QRIS → Generate QR → PENDING          │
│  • VA   → Generate VA → PENDING          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Modal Payment Details:                  │
│  • QR Code / VA Number                   │
│  • Countdown 5 menit                     │
│  • Polling status setiap 5 detik         │
└──────┬───────────────────────────────────┘
       │
       ├─────► (Dev) Simulasi Bayar ────┐
       │                                 │
       ├─────► (Real) User bayar → Midtrans
       │                           notif webhook
       │                                 │
       ▼                                 ▼
┌──────────────────────────────────────────┐
│  Backend Update Status → PAID            │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Frontend Polling Detect PAID            │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Modal "Pembayaran Berhasil - Cetak?"    │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Redirect ke Struk + Auto-Print          │
└──────────────────────────────────────────┘
```

---

## 📞 Support

Jika ada masalah:

1. **Cek dokumentasi Midtrans:** [https://docs.midtrans.com/](https://docs.midtrans.com/)
2. **Laravel logs:** `backend/storage/logs/laravel.log`
3. **Browser console:** Developer Tools → Console
4. **Network tab:** Developer Tools → Network (filter XHR)

---

## 📝 Changelog

- **2026-09-03:** Initial setup documentation
  - Setup simulasi mode (FakePaymentGateway)
  - Setup Midtrans integration
  - Countdown timer 5 menit
  - Auto-print struk
  - Webhook configuration

---

**Selamat mencoba! 🎉**
