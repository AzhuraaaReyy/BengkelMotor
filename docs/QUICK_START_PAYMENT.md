# ⚡ Quick Start - Payment Gateway

Panduan cepat untuk mulai menggunakan sistem pembayaran QRIS dan Virtual Account.

---

## 🚀 Mode Simulasi (Development) - 5 Menit Setup

### 1. Backend Setup
```bash
cd backend

# Pastikan .env tidak ada Midtrans Keys (kosong)
# MIDTRANS_SERVER_KEY=
# MIDTRANS_CLIENT_KEY=

php artisan config:clear
php artisan cache:clear
php artisan serve
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Testing
1. Buka browser: `http://localhost:5173`
2. Login ke aplikasi
3. Pergi ke POS page
4. Tambah produk ke cart
5. Klik "Bayar"

#### Test CASH:
- Pilih CASH → Input uang → Konfirmasi → ✅ Langsung ke struk

#### Test QRIS:
- Pilih QRIS → Proses Pembayaran
- QR Code muncul (bisa discan!)
- Countdown 5 menit dimulai
- Klik tombol **"Simulasi Bayar (Dev)"** → ✅ Modal sukses → Cetak struk

#### Test VA:
- Pilih VA → Proses Pembayaran
- VA Number `1234567890` muncul
- Countdown 5 menit dimulai
- Klik tombol **"Simulasi Bayar (Dev)"** → ✅ Modal sukses → Cetak struk

**DONE! 🎉**

---

## 🌐 Mode Real (Midtrans Sandbox) - 15 Menit Setup

### 1. Daftar Midtrans
1. Kunjungi: https://dashboard.midtrans.com/
2. Sign Up → Verifikasi email → Login

### 2. Dapatkan API Keys
1. Pilih **"Sandbox"** mode (pojok kanan atas)
2. Settings → Access Keys
3. Copy **Server Key** dan **Client Key**

### 3. Update Backend .env
```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
```

### 4. Restart Backend
```bash
cd backend
php artisan config:clear
php artisan serve
```

### 5. Setup Webhook (Optional untuk testing)

**Jika deploy online:**
```
https://your-domain.com/api/v1/payments/webhook/midtrans
```

**Jika testing local (gunakan Ngrok):**
```bash
# Terminal 1: Backend
php artisan serve

# Terminal 2: Ngrok
ngrok http 8000

# Copy ngrok URL: https://abc123.ngrok.io
# Webhook URL: https://abc123.ngrok.io/api/v1/payments/webhook/midtrans
```

Masukkan webhook URL ke:
- Midtrans Dashboard → Settings → Configuration → Notification URL

### 6. Testing dengan Midtrans Simulator
1. Buat transaksi QRIS/VA di aplikasi
2. QR Code/VA Number dari Midtrans akan muncul
3. Login ke Midtrans Dashboard
4. Transactions → Simulator
5. Pilih transaksi → Klik **"Pay"**
6. ✅ Webhook trigger → Status PAID → Modal sukses muncul

**DONE! 🎉**

---

## 🎯 Fitur yang Sudah Aktif

✅ **QRIS Real** - QR Code dari Midtrans (atau simulasi EMVCo)  
✅ **VA Real** - Virtual Account dari Midtrans (atau simulasi)  
✅ **Countdown Timer** - 5 menit dengan progress bar  
✅ **Auto-Polling** - Cek status setiap 5 detik  
✅ **Modal Sukses** - Konfirmasi "Cetak Struk?"  
✅ **Auto-Print** - Dialog print otomatis muncul  
✅ **Handle Expired** - Tombol "Coba Lagi"  
✅ **Copy VA** - 1-click copy nomor VA  
✅ **Simulasi Button** - Testing instant payment (dev mode)  

---

## 🔄 Toggle Mode

### Simulasi Mode → Real Mode:
```bash
# Edit backend/.env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx  # ISI
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx  # ISI

php artisan config:clear
```

### Real Mode → Simulasi Mode:
```bash
# Edit backend/.env
MIDTRANS_SERVER_KEY=  # KOSONGKAN
MIDTRANS_CLIENT_KEY=  # KOSONGKAN

php artisan config:clear
```

---

## 🐛 Troubleshooting Cepat

### QR Code tidak muncul?
```bash
# Check response API
curl http://localhost:8000/api/v1/sales/{sale_id} | jq
# Cari field: gateway_qr_string atau gateway_qr_url
```

### Webhook tidak diterima?
```bash
# Check Laravel logs
tail -f backend/storage/logs/laravel.log

# Test manual webhook
curl -X POST http://localhost:8000/api/v1/payments/webhook/midtrans \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "SALE-001",
    "transaction_status": "settlement",
    "gross_amount": "100000",
    "transaction_id": "TX-123"
  }'
```

### Polling tidak work?
- Buka DevTools → Network tab
- Filter: XHR
- Cari request ke `/api/v1/sales/{id}` setiap 5 detik
- Jika tidak ada → cek console error

### Auto-print tidak trigger?
- Cek URL bar → harus ada `?autoprint=true`
- Browser block popup? → Allow popup
- Cek console → ada error?

---

## 📚 Dokumentasi Lengkap

- **Setup Detail:** `docs/PAYMENT_SETUP.md`
- **Implementation Summary:** `docs/IMPLEMENTATION_SUMMARY.md`
- **Midtrans Docs:** https://docs.midtrans.com/

---

## 🎬 Demo Flow

```
1. User pilih produk → Add to cart
2. Klik "Bayar" → Pilih QRIS/VA
3. Klik "Proses Pembayaran"
   ↓
4. Modal muncul:
   - QR Code / VA Number (REAL dari backend)
   - Countdown 5:00 menit
   - Progress bar
   ↓
5. User bayar (atau klik Simulasi Bayar untuk dev)
   ↓
6. Sistem polling detect status PAID
   ↓
7. Modal "Pembayaran Berhasil - Cetak Struk?"
   ↓
8. Klik "Cetak Struk"
   ↓
9. Redirect ke struk + Auto-print dialog
   ↓
10. DONE! ✅
```

---

## ⚠️ Catatan Penting

1. **Tombol "Simulasi Bayar (Dev)"** hanya muncul di development (`import.meta.env.DEV`)
2. **Webhook** harus HTTPS di production (HTTP ok untuk local testing)
3. **Timer 5 menit** fixed (tidak bisa diubah dari frontend)
4. **QR Code** generate dari backend, frontend hanya display
5. **Polling** otomatis stop saat status PAID atau EXPIRED

---

**Selamat mencoba! 🚀**

Ada pertanyaan? Lihat `docs/PAYMENT_SETUP.md` untuk panduan detail.
