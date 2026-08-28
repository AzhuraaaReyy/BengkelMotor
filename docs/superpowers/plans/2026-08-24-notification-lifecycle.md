# Notification Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notifikasi TRANSAKSI terhapus otomatis saat dibaca (retensi DB maks 30 hari, termasuk SYSTEM); notifikasi STOK tidak pernah terhapus otomatis — hilang hanya saat stok kembali aman (>= 5).

**Architecture:** Ubah semantik mark-as-read menjadi delete untuk TRANSAKSI di `NotificationService`. Tambah resolusi stok di `StockNotificationService` saat stok kembali >= threshold. Command harian `notifications:cleanup` memurnikan TRANSAKSI dan SYSTEM > 30 hari. Frontend menyesuaikan optimistic update.

**Tech Stack:** Laravel 12 (Eloquent, Scheduler), PHPUnit + SQLite in-memory, React + TypeScript.

**Spec:** Keputusan stakeholder di sesi ini (chat), dikonfirmasi: "SYSTEM ikut retensi 30 hari juga".

## Global Constraints

- Tanpa migrasi baru / tanpa kolom baru — pakai skema `notifications` yang ada (`type`, `read_at`, `data`, `created_at`)
- Threshold stok = konstanta existing `STOCK_THRESHOLD = 5`
- Retensi: **30 hari**, berlaku untuk tipe `TRANSACTION` dan `SYSTEM`
- Tipe `STOCK` TIDAK PERNAH dihapus oleh usia atau oleh mark-as-read; hanya oleh resolusi stok
- Query JSON product_id mengikuti pola existing `CAST(data->>'$.product_id' AS UNSIGNED)` (MySQL)

---

### Task 1: Mark-as-read menghapus TRANSAKSI

**Files:**
- Modify: `backend/app/Services/Notifications/NotificationService.php` (`markAsRead`, `markAllAsRead`)
- Create: `backend/tests/Unit/Services/NotificationServiceTest.php`

- [ ] Ganti `markAsRead()`:
```php
public function markAsRead(Notification $notification): void
{
    // Transaksi yang sudah dibaca langsung dihapus dari database;
    // stok tetap hidup sampai kondisinya terselesaikan.
    if ($notification->type === 'TRANSACTION') {
        $notification->delete();
        return;
    }
    $notification->markAsRead();
}
```
- [ ] Ubah `markAllAsRead()`: ganti `->update(['read_at' => now()])` menjadi `->delete()` (query yang sama: baseQuery, whereNull read_at, where type TRANSACTION).
- [ ] Buat test baru:
```php
public function test_marking_transaction_as_read_deletes_it(): void
{
    $user = $this->cashier();
    $n = app(NotificationService::class)->create($user, 'TRANSACTION', 'Transaksi Berhasil', 'TRX-1 dibayar');
    app(NotificationService::class)->markAsRead($n);
    $this->assertDatabaseMissing('notifications', ['id' => $n->id]);
}

public function test_marking_stock_as_read_does_not_delete_it(): void
{
    $user = $this->cashier();
    $n = app(NotificationService::class)->create($user, 'STOCK', 'Stok Menipis', 'Oli tersisa 3');
    app(NotificationService::class)->markAsRead($n);
    $this->assertDatabaseHas('notifications', ['id' => $n->id]);
    $this->assertNotNull($n->fresh()->read_at);
}

public function test_mark_all_as_read_deletes_transactions_only(): void
{
    $user = $this->cashier();
    $svc = app(NotificationService::class);
    $svc->create($user, 'TRANSACTION', 'T1', 'm');
    $svc->create($user, 'STOCK', 'S1', 'm');
    $svc->markAllAsRead($user);
    $this->assertDatabaseMissing('notifications', ['title' => 'T1']);
    $this->assertDatabaseHas('notifications', ['title' => 'S1']);
}
```
- [ ] Run: `php artisan test --filter=NotificationServiceTest` → PASS
- [ ] Commit: `feat(notifications): delete transaction notifications on read`

### Task 2: Stok terpenuhi → notifikasi stok hilang

**Files:**
- Modify: `backend/app/Services/Notifications/NotificationService.php` (tambah method)
- Modify: `backend/app/Services/Notifications/StockNotificationService.php` (blok early-return)
- Test: `backend/tests/Feature/Inventory/ProductStockTest.php` ATAU test unit baru pada service stok

- [ ] Tambah di `NotificationService`:
```php
public function deleteStockForProduct(int $productId): int
{
    return Notification::where('type', 'STOCK')
        ->whereRaw("CAST(data->>'$.product_id' AS UNSIGNED) = ?", [$productId])
        ->delete();
}
```
- [ ] Di `StockNotificationService::check()`, ganti blok:
```php
if ($currentStock >= self::STOCK_THRESHOLD) {
    return;
}
```
menjadi:
```php
if ($currentStock >= self::STOCK_THRESHOLD) {
    // Stok sudah aman → bersihkan notifikasi stok lama produk ini.
    $this->notification->deleteStockForProduct($product->id);
    return;
}
```
- [ ] Test:
```php
public function test_restock_to_safe_level_removes_stock_notifications(): void
{
    $user = $this->cashier();
    $product = \App\Models\Product::factory()->create(['current_stock' => 0]);
    $svc = app(StockNotificationService::class);
    $this->actingAs($user);
    $svc->check($product, 0);
    $this->assertDatabaseCount('notifications', 1);

    $product->update(['current_stock' => 10]);
    $svc->check($product, 10);

    $this->assertDatabaseCount('notifications', 0);
}
```
- [ ] Run: `php artisan test --filter=StockNotification` → PASS (buat file test jika belum ada)
- [ ] Commit: `feat(notifications): resolve stock notifications when stock replenished`

### Task 3: Command pembersihan harian (retensi 30 hari, TRANSAKSI + SYSTEM)

**Files:**
- Modify: `backend/app/Services/Notifications/NotificationService.php` (`cleanup`)
- Create: `backend/app/Console/Commands/CleanupNotifications.php`
- Modify: `backend/routes/console.php`
- Test: tambah ke `backend/tests/Unit/Services/NotificationServiceTest.php`

- [ ] Test:
```php
public function test_cleanup_purges_old_transaction_and_system_but_keeps_stock(): void
{
    $user = $this->cashier();
    $svc = app(NotificationService::class);
    $svc->create($user, 'TRANSACTION', 'Lama T', 'x');
    $svc->create($user, 'SYSTEM', 'Lama S', 'x');
    $svc->create($user, 'STOCK', 'Stok habis', 'x');
    \App\Models\Notification::query()->update(['created_at' => now()->subDays(31)]);

    $deleted = $svc->cleanup(30);

    $this->assertSame(2, $deleted);
    $this->assertDatabaseMissing('notifications', ['title' => 'Lama T']);
    $this->assertDatabaseMissing('notifications', ['title' => 'Lama S']);
    $this->assertDatabaseHas('notifications', ['title' => 'Stok habis']);
}
```
- [ ] Implementasi `cleanup`:
```php
public function cleanup(int $days = 30): int
{
    // Retensi 30 hari untuk TRANSACTION dan SYSTEM; STOK dikelola
    // oleh resolusi stok (StockNotificationService), bukan usia.
    return Notification::whereIn('type', ['TRANSACTION', 'SYSTEM'])
        ->where('created_at', '<', now()->subDays($days))
        ->delete();
}
```
- [ ] Command (pola `ExpirePendingSales`):
```php
class CleanupNotifications extends Command
{
    protected $signature = 'notifications:cleanup {--days=30}';
    protected $description = 'Hapus notifikasi transaksi & sistem lebih tua dari N hari';

    public function handle(NotificationService $notifications): int
    {
        $deleted = $notifications->cleanup((int) $this->option('days'));
        $this->info("Deleted {$deleted} notifications.");
        return self::SUCCESS;
    }
}
```
- [ ] Registrasi di `routes/console.php`: `Schedule::command('notifications:cleanup')->daily();`
- [ ] Run: `php artisan test --filter=NotificationServiceTest` → PASS; smoke: `php artisan notifications:cleanup` → OK
- [ ] Commit: `feat(notifications): daily retention cleanup for transactions and system`

### Task 4: Frontend — optimistic update jadi hapus

**Files:**
- Modify: `frontend/src/lib/useNotifications.ts` (`markAsRead`, `markAllAsRead`)

- [ ] Karena backend menghapus TRANSAKSI saat dibaca, optimistic update menghapus item non-STOCK dari list:
  - `markAsRead(id)`: cari target dari state; jika type !== "STOCK" → hapus item dari list dan kurangi `transaction` + `total`; jika STOCK → set `read_at` seperti sebelumnya.
  - `markAllAsRead()`: `setNotifications(prev => prev.filter(n => n.type === "STOCK"))`, counts → `{ stock: prev.stock, transaction: 0, total: prev.stock }`.
- [ ] Run: `npm run typecheck && npm run lint && npm run build` → PASS
- [ ] Commit: `feat(frontend): remove read transaction notifications optimistically`

## Self-Review

- Spec coverage: delete-on-read (T1), resolusi stok (T2), retensi 30 hari TRANSAKSI+SYSTEM via scheduler (T3), konsistensi UI (T4). ✔
- Placeholder scan: semua langkah berisi kode konkret. ✔
- Type consistency: `deleteStockForProduct(int): int`, `cleanup(int=30): int` dipakai konsisten. ✔
