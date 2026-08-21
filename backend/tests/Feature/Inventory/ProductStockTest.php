<?php

namespace Tests\Feature\Inventory;

use App\Models\Product;
use App\Models\StockMovement;
use Tests\TestCase;

class ProductStockTest extends TestCase
{
    public function test_cashier_can_list_products_but_never_sees_purchase_price(): void
    {
        $cashier = $this->cashier();
        Product::factory()->create(['purchase_price' => 15000, 'sale_price' => 25000]);

        $response = $this->actingAs($cashier)->getJson('/api/v1/products');

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('purchase_price', $response->json('data.data.0'));
    }

    public function test_cashier_sees_purchase_price_only_when_include_cost_is_requested(): void
    {
        $cashier = $this->cashier();
        Product::factory()->create(['purchase_price' => 15000, 'sale_price' => 25000]);

        $withoutFlag = $this->actingAs($cashier)->getJson('/api/v1/products');
        $withoutFlag->assertStatus(200);
        $this->assertArrayNotHasKey('purchase_price', $withoutFlag->json('data.data.0'));

        $withFlag = $this->actingAs($cashier)->getJson('/api/v1/products?include_cost=1');
        $withFlag->assertStatus(200);
        $this->assertSame('15000.00', $withFlag->json('data.data.0.purchase_price'));
    }

    public function test_admin_sees_purchase_price(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['purchase_price' => 15000, 'sale_price' => 25000]);

        $response = $this->actingAs($admin)->getJson('/api/v1/products');

        $response->assertStatus(200)->assertJsonPath('data.data.0.purchase_price', '15000.00');
    }

    public function test_cashier_cannot_create_or_update_products(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create();

        $this->actingAs($cashier)->postJson('/api/v1/products', [
            'name' => 'Produk Baru',
            'unit' => 'pcs',
            'purchase_price' => 1000,
            'sale_price' => 2000,
        ])->assertStatus(403);

        $this->actingAs($cashier)->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Diubah Kasir',
        ])->assertStatus(403);
    }

    public function test_cashier_can_adjust_stock(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($cashier)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 10,
            'type' => 'ADJUSTMENT',
            'note' => 'Koreksi kasir',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.current_stock', 20);
        $this->assertEquals(20, (float) $product->fresh()->current_stock);
    }

    public function test_admin_can_adjust_stock_with_reason(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 8,
            'type' => 'PURCHASE',
            'note' => 'Restock dari supplier',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.current_stock', 18);
        $this->assertSame(1, StockMovement::where('product_id', $product->id)->count());
    }

    public function test_kasir_purchase_creates_linked_expense(): void
    {
        $kasir = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 5, 'purchase_price' => 15000]);

        $response = $this->actingAs($kasir)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 3,
            'type' => 'PURCHASE',
            'note' => 'Beli oli',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.current_stock', 8);

        $movement = StockMovement::where('product_id', $product->id)->first();
        $this->assertNotNull($movement);

        $expense = \App\Models\Expense::where('stock_movement_id', $movement->id)->first();
        $this->assertNotNull($expense);
        $this->assertSame('STOCK_PURCHASE', $expense->source);
        $this->assertSame('Pembelian Stok', $expense->category);
        $this->assertEquals('45000.00', $expense->amount); // 3 × 15000
        $this->assertEquals(3, (int) $expense->quantity);
        $this->assertEquals($kasir->id, $expense->created_by);
    }

    public function test_purchase_expense_is_locked_from_manual_update(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 0, 'purchase_price' => 20000]);

        $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 5,
            'type' => 'PURCHASE',
            'note' => 'Beli',
        ])->assertStatus(200);

        $expense = \App\Models\Expense::where('stock_movement_id', \App\Models\StockMovement::first()->id)->first();

        $response = $this->actingAs($admin)->putJson("/api/v1/expenses/{$expense->id}", [
            'amount' => 1,
            'category' => 'Pembelian Stok',
        ]);

        $response->assertStatus(403)->assertJsonPath('code', 'EXPENSE_LOCKED');
    }

    public function test_fractional_stock_is_rejected(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($cashier)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 10.5,
            'type' => 'ADJUSTMENT',
            'note' => 'Stok tidak bisa pecahan',
        ]);

        $response->assertStatus(422);
        $this->assertEquals(10, (float) $product->fresh()->current_stock);
    }

    public function test_zero_quantity_is_rejected(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 0,
            'type' => 'ADJUSTMENT',
            'note' => 'Tidak ada perubahan',
        ]);

        $response->assertStatus(422);
        $this->assertEquals(10, (float) $product->fresh()->current_stock);
    }

    public function test_product_master_rejects_fractional_stock_on_create(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin)->postJson('/api/v1/products', [
            'name' => 'Produk Pecahan',
            'unit' => 'pcs',
            'purchase_price' => 1000,
            'sale_price' => 2000,
            'current_stock' => 5.5,
            'min_stock' => 1.5,
        ]);

        $response->assertStatus(422);
    }

    public function test_products_index_honors_per_page(): void
    {
        $admin = $this->admin();
        Product::factory()->count(25)->create();

        $all = $this->actingAs($admin)->getJson('/api/v1/products?per_page=100&all=1');
        $all->assertStatus(200);
        $this->assertSame(25, count($all->json('data.data')));

        $paged = $this->actingAs($admin)->getJson('/api/v1/products?per_page=5');
        $paged->assertStatus(200);
        $this->assertSame(5, count($paged->json('data.data')));
        $this->assertSame(5, $paged->json('data.per_page'));
    }

    public function test_stock_adjustment_without_note_is_rejected(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 8,
            'type' => 'ADJUSTMENT',
        ]);

        $response->assertStatus(422);
    }

    public function test_current_stock_cannot_be_changed_via_master_update_endpoint(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($admin)->putJson("/api/v1/products/{$product->id}", [
            'current_stock' => 999,
            'name' => $product->name,
        ]);

        $response->assertStatus(200);
        $this->assertEquals(10, (float) $product->fresh()->current_stock);
        $this->assertSame(0, StockMovement::where('product_id', $product->id)->count());
    }

    public function test_stock_movement_history_endpoint_returns_paginated_movements(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 5,
            'type' => 'PURCHASE',
            'note' => 'Restock',
        ])->assertStatus(200);

        $response = $this->actingAs($admin)->getJson("/api/v1/products/{$product->id}/movements");

        $response->assertStatus(200);
        $this->assertSame(1, count($response->json('data.data')));
        $this->assertEquals(5, (float) $response->json('data.data.0.quantity_change'));
        $this->assertEquals(15, (float) $response->json('data.data.0.stock_after'));
    }

    public function test_low_stock_filter_returns_only_products_at_or_below_minimum(): void
    {
        $admin = $this->admin();
        Product::factory()->lowStock()->create(['name' => 'Stok Rendah']);
        Product::factory()->create(['current_stock' => 100, 'min_stock' => 5, 'name' => 'Stok Aman']);

        $response = $this->actingAs($admin)->getJson('/api/v1/products?low_stock=1');

        $response->assertStatus(200);
        $names = collect($response->json('data.data'))->pluck('name');
        $this->assertTrue($names->contains('Stok Rendah'));
        $this->assertFalse($names->contains('Stok Aman'));
    }

    public function test_movements_include_direction_creator_and_sale_code(): void
    {
        $admin = $this->admin();
        $product = Product::factory()->create(['current_stock' => 10]);

        $this->actingAs($admin)->postJson("/api/v1/products/{$product->id}/adjust-stock", [
            'quantity' => 10,
            'type' => 'PURCHASE',
            'note' => 'Restock',
        ])->assertStatus(200);

        $sale = \App\Models\Sale::factory()->paid()->create();
        StockMovement::create([
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_SALE,
            'quantity_change' => -1,
            'stock_before' => 20,
            'stock_after' => 19,
            'sale_id' => $sale->id,
            'created_by' => $admin->id,
            'note' => 'Penjualan nota',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson("/api/v1/products/{$product->id}/movements");
        $response->assertStatus(200);
        $byType = collect($response->json('data.data'))->keyBy('type');

        $this->assertSame('IN', $byType['PURCHASE']['direction']);
        $this->assertSame($admin->name, $byType['PURCHASE']['created_by_name']);
        // PURCHASE restock is linked to the auto-created expense.
        $this->assertSame('200000.00', $byType['PURCHASE']['expense_amount']); // 10 × 20000

        $this->assertSame('OUT', $byType['SALE']['direction']);
        $this->assertSame($sale->sale_code, $byType['SALE']['sale_code']);
        $this->assertSame($admin->name, $byType['SALE']['created_by_name']);
        $this->assertNull($byType['SALE']['expense_amount']);
    }

    public function test_low_stock_endpoint_lists_products_below_five_only(): void
    {
        $cashier = $this->cashier();
        Product::factory()->create(['current_stock' => 0, 'name' => 'Habis']);
        Product::factory()->create(['current_stock' => 4, 'name' => 'Menipis 4']);
        Product::factory()->create(['current_stock' => 3, 'name' => 'Menipis 3']);
        Product::factory()->create(['current_stock' => 5, 'name' => 'Aman 5']);
        Product::factory()->create(['current_stock' => 50, 'name' => 'Aman 50']);

        $response = $this->actingAs($cashier)->getJson('/api/v1/products/low-stock');

        $response->assertStatus(200);
        $data = collect($response->json('data'))->keyBy('name');
        $this->assertCount(3, $data);
        $this->assertTrue($data->has('Habis'));
        $this->assertTrue($data->has('Menipis 4'));
        $this->assertTrue($data->has('Menipis 3'));
        $this->assertFalse($data->has('Aman 5'));
        $this->assertFalse($data->has('Aman 50'));
        $this->assertTrue($data['Habis']['is_out']);
        $this->assertFalse($data['Menipis 4']['is_out']);
        $this->assertSame(1, $response->json('counts.out_of_stock'));
        $this->assertSame(2, $response->json('counts.low'));
        $this->assertSame(3, $response->json('counts.total'));
    }
}
