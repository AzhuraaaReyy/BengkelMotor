<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Inventory\AdjustStockService;
use RuntimeException;
use Tests\TestCase;

class AdjustStockServiceTest extends TestCase
{
    public function test_admin_can_adjust_stock_and_movement_is_recorded(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $product = Product::factory()->create(['current_stock' => 10]);

        // Delta input: +15 → 25.
        $updated = app(AdjustStockService::class)->adjust($product, 15, StockMovement::TYPE_PURCHASE, 'Restock supplier');

        $this->assertEquals(25, (float) $updated->current_stock);

        $movement = StockMovement::where('product_id', $product->id)->first();
        $this->assertSame(StockMovement::TYPE_PURCHASE, $movement->type);
        $this->assertEquals(10, (float) $movement->stock_before);
        $this->assertEquals(25, (float) $movement->stock_after);
        $this->assertEquals(15, (float) $movement->quantity_change);
        $this->assertSame('Restock supplier', $movement->note);

        $this->assertTrue(
            AuditLog::where('action', AuditLog::ACTION_STOCK_ADJUSTMENT)->orWhere('action', AuditLog::ACTION_STOCK_PURCHASE)->exists()
        );
    }

    public function test_cashier_can_adjust_stock(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $product = Product::factory()->create(['current_stock' => 10]);

        $updated = app(AdjustStockService::class)->adjust($product, 10, StockMovement::TYPE_ADJUSTMENT, 'Koreksi');

        $this->assertEquals(20, (float) $updated->current_stock);
        $movement = StockMovement::where('product_id', $product->id)->first();
        $this->assertSame(StockMovement::TYPE_ADJUSTMENT, $movement->type);
        $this->assertEquals(10, (float) $movement->quantity_change);
    }

    public function test_purchase_records_stock_movement_without_expense(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create([
            'current_stock' => 3,
            'purchase_price' => 15000,
        ]);

        $updated = app(AdjustStockService::class)->adjust($product, 7, StockMovement::TYPE_PURCHASE, 'Beli oli');

        $this->assertEquals(10, (float) $updated->current_stock);

        $movement = StockMovement::where('product_id', $product->id)->first();
        $this->assertNotNull($movement);
        $this->assertSame(StockMovement::TYPE_PURCHASE, $movement->type);
        $this->assertEquals(7, (float) $movement->quantity_change);
        $this->assertSame(0, Expense::count());
        $this->assertFalse(
            AuditLog::where('action', AuditLog::ACTION_EXPENSE_CREATED)->where('entity_type', 'expense')->exists()
        );
    }

    public function test_purchase_never_creates_expense_regardless_of_purchase_price(): void
    {
        $this->actingAs($this->admin());
        $freeProduct = Product::factory()->create(['current_stock' => 0, 'purchase_price' => 0]);
        $pricedProduct = Product::factory()->create(['current_stock' => 0, 'purchase_price' => 25000]);

        app(AdjustStockService::class)->adjust($freeProduct, 5, StockMovement::TYPE_PURCHASE, 'Stok masuk');
        app(AdjustStockService::class)->adjust($pricedProduct, 2, StockMovement::TYPE_PURCHASE, 'Stok masuk');

        $this->assertEquals(5, (float) $freeProduct->fresh()->current_stock);
        $this->assertEquals(2, (float) $pricedProduct->fresh()->current_stock);
        $this->assertSame(0, Expense::count());
    }

    public function test_adjustment_never_creates_expense(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 10, 'purchase_price' => 20000]);

        // Positive adjustment (opname finding) → stock only, no expense.
        app(AdjustStockService::class)->adjust($product, 5, StockMovement::TYPE_ADJUSTMENT, 'Hasil opname');
        // Negative adjustment (loss) → stock only, no expense.
        app(AdjustStockService::class)->adjust($product, -3, StockMovement::TYPE_ADJUSTMENT, 'Selisih hilang');

        $this->assertEquals(12, (float) $product->fresh()->current_stock);
        $this->assertSame(0, Expense::count());
    }


    public function test_negative_stock_is_rejected(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(422);

        app(AdjustStockService::class)->adjust($product, -11, StockMovement::TYPE_ADJUSTMENT, 'Koreksi');
    }

    public function test_negative_purchase_quantity_is_rejected(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(422);

        app(AdjustStockService::class)->adjust($product, -5, StockMovement::TYPE_PURCHASE, 'Beli');
    }

    public function test_zero_change_is_rejected(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(422);

        app(AdjustStockService::class)->adjust($product, 0, StockMovement::TYPE_ADJUSTMENT, 'Sama saja');
    }

    public function test_fractional_stock_is_rejected(): void
    {
        $this->actingAs($this->cashier());
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(422);

        app(AdjustStockService::class)->adjust($product, 10.5, StockMovement::TYPE_ADJUSTMENT, 'Koreksi');
    }

    public function test_note_is_required(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionCode(422);

        app(AdjustStockService::class)->adjust($product, 20, StockMovement::TYPE_ADJUSTMENT, '  ');
    }
}
