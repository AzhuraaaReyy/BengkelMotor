<?php

namespace Tests\Unit\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Service;
use App\Models\StockMovement;
use App\Services\Sales\CheckoutSaleService;
use RuntimeException;
use Tests\TestCase;

class CheckoutSaleServiceTest extends TestCase
{
    private function draftSale(): Sale
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);

        return Sale::factory()->for($cashier, 'cashier')->create();
    }

    public function test_checkout_computes_totals_snapshots_price_and_decrements_stock(): void
    {
        $sale = $this->draftSale();
        $product = Product::factory()->create(['sale_price' => 30000, 'purchase_price' => 20000, 'current_stock' => 10]);

        $item = $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'item_code_snapshot' => $product->sku,
            'quantity' => 3,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $paid = app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);

        $this->assertSame(Sale::STATUS_PAID, $paid->status);
        $this->assertEquals(90000, (float) $paid->subtotal);
        $this->assertEquals(90000, (float) $paid->grand_total);

        $item->refresh();
        $this->assertEquals(30000, (float) $item->unit_price);
        $this->assertEquals(20000, (float) $item->purchase_price_snapshot);
        $this->assertEquals(90000, (float) $item->subtotal);

        $product->refresh();
        $this->assertEquals(7, (float) $product->current_stock);

        $movement = StockMovement::where('product_id', $product->id)->where('sale_id', $sale->id)->first();
        $this->assertNotNull($movement);
        $this->assertSame(StockMovement::TYPE_SALE, $movement->type);
        $this->assertEquals(10, (float) $movement->stock_before);
        $this->assertEquals(7, (float) $movement->stock_after);
        $this->assertEquals(-3, (float) $movement->quantity_change);
    }

    public function test_checkout_uses_current_master_price_at_checkout_time_not_at_add_time(): void
    {
        // Security.md A4: backend loads master price at checkout time.
        $sale = $this->draftSale();
        $product = Product::factory()->create(['sale_price' => 30000, 'current_stock' => 10]);

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        // Master price changes after the item was added to the DRAFT sale.
        $product->update(['sale_price' => 99000]);

        $paid = app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);

        $this->assertEquals(99000, (float) $paid->grand_total);
    }

    public function test_checkout_rejects_insufficient_stock_and_rolls_back(): void
    {
        $sale = $this->draftSale();
        $product = Product::factory()->create(['current_stock' => 2]);

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 5,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $this->expectException(RuntimeException::class);

        try {
            app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);
        } finally {
            $sale->refresh();
            $product->refresh();
            $this->assertSame(Sale::STATUS_DRAFT, $sale->status);
            $this->assertEquals(2, (float) $product->current_stock);
            $this->assertSame(0, StockMovement::where('product_id', $product->id)->count());
        }
    }

    public function test_checkout_rejects_discount_exceeding_subtotal(): void
    {
        $sale = $this->draftSale();
        $product = Product::factory()->create(['sale_price' => 10000, 'current_stock' => 10]);

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 999999);
    }

    public function test_checkout_rejects_negative_discount(): void
    {
        $sale = $this->draftSale();

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, -1);
    }

    public function test_checkout_rejects_inactive_product(): void
    {
        $sale = $this->draftSale();
        $product = Product::factory()->inactive()->create();

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);
    }

    public function test_checkout_rejects_inactive_service(): void
    {
        $sale = $this->draftSale();
        $service = Service::factory()->inactive()->create();

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_SERVICE,
            'service_id' => $service->id,
            'item_name_snapshot' => $service->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);
    }

    public function test_checkout_rejects_already_paid_sale(): void
    {
        $sale = $this->draftSale();
        $product = Product::factory()->create(['current_stock' => 10]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);
    }

    public function test_checkout_rejects_a_sale_with_no_items(): void
    {
        // A sale with zero items would become a PAID transaction backed by
        // nothing real ("data halu") — store() already requires min:1 items
        // at creation, but this is the final gate inside the service itself
        // in case a DRAFT sale ever ends up empty by another path.
        $sale = $this->draftSale();

        $this->expectException(RuntimeException::class);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', null, 0);
    }

    public function test_service_items_do_not_affect_stock(): void
    {
        $sale = $this->draftSale();
        $service = Service::factory()->create(['sale_price' => 50000]);

        $sale->items()->create([
            'item_type' => SaleItem::TYPE_SERVICE,
            'service_id' => $service->id,
            'item_name_snapshot' => $service->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $paid = app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);

        $this->assertEquals(50000, (float) $paid->grand_total);
        $this->assertSame(0, StockMovement::count());
    }

    public function test_cashier_id_is_resolved_from_authenticated_user_not_request(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);

        $otherCashier = $this->cashier();

        $paid = app(CheckoutSaleService::class)->checkout($sale, 'CASH', 100000, 0);

        $this->assertSame($cashier->id, $paid->cashier_id);
        $this->assertNotSame($otherCashier->id, $paid->cashier_id);
    }
}
