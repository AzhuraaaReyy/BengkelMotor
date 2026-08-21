<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Inventory\AdjustStockService;
use Illuminate\Support\Facades\DB;
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

    public function test_purchase_creates_linked_expense(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $product = Product::factory()->create([
            'current_stock' => 3,
            'purchase_price' => 15000,
        ]);

        $updated = app(AdjustStockService::class)->adjust($product, 7, StockMovement::TYPE_PURCHASE, 'Beli oli');

        $this->assertEquals(10, (float) $updated->current_stock);

        $movement = StockMovement::where('product_id', $product->id)->first();
        $expense = Expense::where('stock_movement_id', $movement->id)->first();

        $this->assertNotNull($expense, 'PURCHASE must auto-create an expense.');
        $this->assertSame('STOCK_PURCHASE', $expense->source);
        $this->assertSame('Pembelian Stok', $expense->category);
        $this->assertEquals('105000.00', $expense->amount); // 7 × 15000
        $this->assertSame($product->name, $expense->item_name);
        $this->assertEquals(7, (int) $expense->quantity);
        $this->assertEquals('15000.00', $expense->unit_price);
        $this->assertEquals(now()->toDateString(), $expense->expense_date->toDateString());
        $this->assertEquals($admin->id, $expense->created_by);

        $this->assertTrue(
            AuditLog::where('action', AuditLog::ACTION_EXPENSE_CREATED)->where('entity_type', 'expense')->exists()
        );
    }

    public function test_purchase_with_zero_price_creates_no_expense(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 0, 'purchase_price' => 0]);

        app(AdjustStockService::class)->adjust($product, 5, StockMovement::TYPE_PURCHASE, 'Beli gratis');

        $this->assertEquals(5, (float) $product->fresh()->current_stock);
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

    public function test_stock_and_expense_are_atomic_when_expense_fails(): void
    {
        $this->actingAs($this->admin());
        $product = Product::factory()->create(['current_stock' => 5, 'purchase_price' => 10000]);

        // Force the expense insert to fail inside the same transaction.
        Expense::creating(fn () => throw new RuntimeException('DB failure', 500));

        try {
            app(AdjustStockService::class)->adjust($product, 3, StockMovement::TYPE_PURCHASE, 'Beli');
            $this->fail('Expected RuntimeException.');
        } catch (RuntimeException $e) {
            $this->assertSame('DB failure', $e->getMessage());
        }

        $this->assertEquals(5, (float) $product->fresh()->current_stock);
        $this->assertSame(0, StockMovement::where('product_id', $product->id)->count());
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
