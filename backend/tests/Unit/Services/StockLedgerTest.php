<?php

namespace Tests\Unit\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\Inventory\StockLedger;
use Tests\TestCase;

class StockLedgerTest extends TestCase
{
    public function test_decrement_creates_sale_movement_and_reduces_stock(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10]);
        $item = $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 5000,
            'subtotal' => 15000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $ledger->decrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE);

        $product->refresh();
        $this->assertSame(7, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE)->count());
    }

    public function test_increment_creates_reversal_movement_and_increases_stock(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 7]);
        $item = $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 5000,
            'subtotal' => 15000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $ledger->incrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE_REVERSAL);

        $product->refresh();
        $this->assertSame(10, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE_REVERSAL)->count());
    }

    public function test_decrement_throws_when_stock_insufficient(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 2]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 5000,
            'subtotal' => 25000,
            'item_name_snapshot' => $product->name,
        ]);

        $ledger = new StockLedger();
        $this->expectException(\RuntimeException::class);
        $ledger->decrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE);
    }
}
