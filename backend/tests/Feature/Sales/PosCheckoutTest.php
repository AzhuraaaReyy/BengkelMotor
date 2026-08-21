<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\ServiceOrder;
use App\Models\StockMovement;
use App\Models\User;
use Tests\TestCase;

class PosCheckoutTest extends TestCase
{
    public function test_cashier_can_create_draft_sale_add_items_and_checkout(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['sale_price' => 25000, 'purchase_price' => 15000, 'current_stock' => 10]);

        $draft = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [
                ['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 2],
            ],
        ]);
        $draft->assertStatus(201)->assertJsonPath('data.status', 'DRAFT');
        $saleId = $draft->json('data.id');

        $checkout = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", [
            'payment_method' => 'CASH',
            'paid_amount' => 50000,
        ]);

        $checkout->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID')
            ->assertJsonPath('data.grand_total', '50000.00');

        $this->assertEquals(8, (float) $product->fresh()->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $saleId)->count());
    }

    public function test_cashier_response_hides_purchase_price_snapshot_but_admin_sees_it(): void
    {
        $cashier = $this->cashier();
        $admin = $this->admin();
        $product = Product::factory()->create(['sale_price' => 25000, 'purchase_price' => 15000, 'current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $cashierView = $this->actingAs($cashier)->getJson("/api/v1/sales/{$saleId}");
        $cashierView->assertJsonMissingPath('data.items.0.purchase_price_snapshot');

        $adminView = $this->actingAs($admin)->getJson("/api/v1/sales/{$saleId}");
        $adminView->assertJsonPath('data.items.0.purchase_price_snapshot', '15000.00');
    }

    public function test_checkout_rejects_insufficient_stock(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 1]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 5]],
        ])->json('data.id');

        $response = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $response->assertStatus(409)->assertJsonPath('code', 'CHECKOUT_FAILED');
        $this->assertSame(Sale::STATUS_DRAFT, Sale::find($saleId)->status);
        $this->assertEquals(1, (float) $product->fresh()->current_stock);
    }

    public function test_checkout_ignores_client_supplied_grand_total_and_recalculates_server_side(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['sale_price' => 25000, 'current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 2]],
        ])->json('data.id');

        $response = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", [
            'payment_method' => 'CASH',
            'grand_total' => 1,
            'unit_price' => 1,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.grand_total', '50000.00');
    }

    public function test_double_checkout_only_finalizes_once(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['sale_price' => 10000, 'current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $first = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);
        $second = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $first->assertStatus(200);
        $second->assertStatus(409);

        $this->assertSame(1, StockMovement::where('sale_id', $saleId)->count());
        $this->assertEquals(9, (float) $product->fresh()->current_stock);
    }

    public function test_negative_and_zero_quantity_rejected_on_draft_creation(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create();

        $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => -10]],
        ])->assertStatus(422);

        $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 0]],
        ])->assertStatus(422);
    }

    public function test_paid_sale_cannot_be_edited(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $edit = $this->actingAs($cashier)->putJson("/api/v1/sales/{$saleId}", [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 99]],
        ]);

        $edit->assertStatus(422);
    }

    public function test_draft_sale_cannot_be_updated_to_have_zero_items(): void
    {
        // Regression: items had no min:1 on update(), so a DRAFT sale's
        // items could be cleared out entirely and then checked out as a
        // PAID transaction with nothing actually sold ("data halu").
        $cashier = $this->cashier();
        $product = Product::factory()->create(['current_stock' => 10]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $response = $this->actingAs($cashier)->putJson("/api/v1/sales/{$saleId}", [
            'items' => [],
        ]);

        $response->assertStatus(422);
        $this->assertSame(1, Sale::find($saleId)->items()->count());
    }

    public function test_checkout_backfills_customer_from_the_linked_service_order(): void
    {
        // Regression: the POS flow only ever sends service_order_id when
        // checking out (Kasir picks the customer once, at order-open time),
        // so the sale itself was left with customer_id permanently null and
        // the receipt could never show who it was for.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create(['name' => 'Budi Santoso']);
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $response = $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", [
            'payment_method' => 'CASH',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.customer.name', 'Budi Santoso');

        $sale = Sale::find($saleId);
        $this->assertSame($customer->id, $sale->customer_id);
    }

    public function test_a_second_sale_cannot_reuse_a_service_order_that_already_has_one(): void
    {
        // Regression: a stale ?service_order= left over in the POS page URL
        // (e.g. after finishing one order's transaction and immediately
        // ringing up an unrelated walk-in sparepart sale in the same tab)
        // could silently attach a second, unrelated sale to that order.
        // sales.service_order_id is unique in the schema, so this must be
        // rejected with a clean 422, not a raw DB constraint error.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $firstSaleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$firstSaleId}/checkout", ['payment_method' => 'CASH']);

        $response = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ]);

        $response->assertStatus(422);
        $this->assertSame(1, Sale::where('service_order_id', $orderId)->count());
    }

    public function test_cashier_id_cannot_be_spoofed_via_request_body(): void
    {
        $cashier = $this->cashier();
        $otherCashier = User::factory()->cashier()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $response = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'cashier_id' => $otherCashier->id,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ]);

        $saleId = $response->json('data.id');
        $this->assertSame($cashier->id, Sale::find($saleId)->cashier_id);
    }
}
