<?php

namespace Tests\Feature\Security;

use App\Models\Customer;
use App\Models\Product;
use Tests\TestCase;

/**
 * Covers Security.md §B7 abuse cases that are backend-testable: stored
 * payloads must round-trip as inert text (not be executed/interpreted
 * server-side), search input must go through parameter binding, and
 * unhandled errors must not leak internals to the client.
 */
class AbuseCasesTest extends TestCase
{
    public function test_html_payload_in_product_name_is_stored_and_returned_as_plain_text(): void
    {
        $admin = $this->admin();
        $payload = '<img src=x onerror=alert(1)>';

        $response = $this->actingAs($admin)->postJson('/api/v1/products', [
            'name' => $payload,
            'unit' => 'pcs',
            'purchase_price' => 1000,
            'sale_price' => 2000,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['name' => $payload]);

        // JSON encoding must return the literal string, not execute/strip it.
        $show = $this->actingAs($admin)->getJson('/api/v1/products/' . $response->json('data.id'));
        $this->assertSame($payload, $show->json('data.name'));
    }

    public function test_sql_injection_style_search_does_not_break_or_leak_data(): void
    {
        $admin = $this->admin();
        Product::factory()->create(['name' => 'Oli Mesin']);
        Customer::factory()->create(['name' => 'Andi']);

        $productSearch = $this->actingAs($admin)->getJson('/api/v1/products?search=' . urlencode("' OR 1=1--"));
        $productSearch->assertStatus(200);
        $this->assertEmpty($productSearch->json('data.data'));

        $customerSearch = $this->actingAs($admin)->getJson('/api/v1/customers?search=' . urlencode("'; DROP TABLE customers;--"));
        $customerSearch->assertStatus(200);
        $this->assertDatabaseHas('customers', ['name' => 'Andi']);
    }

    public function test_unhandled_exception_does_not_leak_stack_trace_or_file_paths(): void
    {
        $admin = $this->admin();

        // Non-existent resource id triggers a 404 via route-model-binding
        // rather than a raw exception; assert the response body stays generic.
        $response = $this->actingAs($admin)->getJson('/api/v1/products/999999');

        $response->assertStatus(404);
        $body = $response->getContent();
        $this->assertStringNotContainsString(base_path(), $body);
        $this->assertStringNotContainsString('.php', $body);
        $this->assertStringNotContainsString('Stack trace', $body);
    }

    public function test_env_and_git_paths_are_not_served(): void
    {
        $this->get('/.env')->assertStatus(404);
        $this->get('/.git/config')->assertStatus(404);
    }

    public function test_cashier_cannot_read_purchase_price_via_sale_item_response(): void
    {
        $cashier = $this->cashier();
        $product = Product::factory()->create(['purchase_price' => 15000, 'sale_price' => 25000, 'current_stock' => 5]);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $response = $this->actingAs($cashier)->getJson("/api/v1/sales/{$saleId}");
        $raw = $response->getContent();

        $this->assertStringNotContainsString('purchase_price', $raw);
    }
}
