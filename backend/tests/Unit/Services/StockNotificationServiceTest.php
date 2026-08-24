<?php

namespace Tests\Unit\Services;

use App\Models\Product;
use App\Services\Notifications\StockNotificationService;
use Tests\TestCase;

class StockNotificationServiceTest extends TestCase
{
    public function test_low_stock_creates_notification(): void
    {
        $user = $this->cashier();
        $this->actingAs($user);
        $product = Product::factory()->create(['current_stock' => 0]);

        app(StockNotificationService::class)->check($product, 0);

        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_restock_to_safe_level_removes_stock_notifications(): void
    {
        $user = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 0]);
        $svc = app(StockNotificationService::class);
        $this->actingAs($user);
        $svc->check($product, 0);
        $this->assertDatabaseCount('notifications', 1);

        $product->update(['current_stock' => 10]);
        $svc->check($product, 10);

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_partial_restock_replaces_stale_out_of_stock_snapshot(): void
    {
        // "Stok Habis!" tidak boleh menggantung setelah restock sebagian:
        // snapshot unread harus diganti dengan kondisi terbaru (menipis, 3).
        $user = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 0]);
        $svc = app(StockNotificationService::class);
        $this->actingAs($user);
        $svc->check($product, 0);

        $product->update(['current_stock' => 3]);
        $svc->check($product, 3);

        $this->assertDatabaseCount('notifications', 1);
        $n = \App\Models\Notification::first();
        $this->assertSame('Stok Menipis', $n->title);
        $this->assertSame(3, (int) $n->data['current_stock']);
    }

    public function test_identical_low_stock_state_does_not_duplicate(): void
    {
        $user = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 3]);
        $svc = app(StockNotificationService::class);
        $this->actingAs($user);
        $svc->check($product, 3);
        $svc->check($product, 3);

        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_sync_stock_command_creates_notification_for_silent_zero_stock(): void
    {
        // Produk yang sudah habis tanpa pernah menaikkan notifikasi
        // (kejadian di luar jalur penjualan/Atur Stok) harus tertangkap
        // oleh sweep rekonsiliasi.
        \App\Models\User::factory()->cashier()->create();
        Product::factory()->create(['current_stock' => 0, 'name' => 'Silent Habis']);

        $this->artisan('notifications:sync-stock')->assertSuccessful();

        $this->assertDatabaseHas('notifications', [
            'type' => 'STOCK',
            'title' => 'Stok Habis!',
        ]);
    }

    public function test_sync_stock_command_replaces_stale_snapshot_and_clears_safe_products(): void
    {
        \App\Models\User::factory()->cashier()->create();
        $stale = Product::factory()->create(['current_stock' => 0, 'name' => 'Stale']);
        $safe = Product::factory()->create(['current_stock' => 9, 'name' => 'Sudah Aman']);
        app(\App\Services\Notifications\StockNotificationService::class)->check($stale, 3); // snapshot usang "menipis 3"

        $this->artisan('notifications:sync-stock')->assertSuccessful();

        $n = \App\Models\Notification::where('type', 'STOCK')->get();
        $this->assertSame(1, $n->count());
        $this->assertSame('Stok Habis!', $n[0]->title);
        $this->assertSame($stale->id, (int) $n[0]->data['product_id']);
        $this->assertDatabaseMissing('notifications', ['product_id' => null]);
        // Produk aman tidak meninggalkan notifikasi stok apa pun.
        $this->assertTrue($n->every(fn ($row) => (int) $row->data['product_id'] === $stale->id));
    }
}
