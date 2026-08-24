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
}
