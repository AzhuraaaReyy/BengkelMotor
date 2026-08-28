<?php

namespace Tests\Feature\ServiceOrders;

use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\Product;
use App\Models\ServiceOrder;
use Tests\TestCase;

class ServiceOrderTest extends TestCase
{
    public function test_cashier_can_create_a_service_order_with_mechanic_selection(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $mechanic = Mechanic::factory()->create();

        $response = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'mechanic_id' => $mechanic->id,
            'complaint' => 'Suara mesin kasar',
        ]);

        // Defaults to OPEN ("Baru"): the Kasir does not manage status — a new
        // order is recorded as "Baru" and completes automatically when its
        // linked transaction is paid.
        $response->assertStatus(201)->assertJsonPath('data.status', 'OPEN');
        $this->assertDatabaseHas('service_orders', [
            'customer_id' => $customer->id,
            'mechanic_id' => $mechanic->id,
            'cashier_id' => $cashier->id,
        ]);
    }

    public function test_new_order_defaults_to_open(): void
    {
        // Kasir tidak mengatur status: order baru langsung tercatat "Baru"
        // (OPEN) dan otomatis menjadi "Selesai" (DONE) saat transaksinya dibayar.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $response = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Tanpa status eksplisit',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'OPEN');
    }

    public function test_customer_is_required(): void
    {
        $cashier = $this->cashier();

        $response = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'complaint' => 'Tanpa data pelanggan',
        ]);

        $response->assertStatus(422);
    }

    public function test_service_order_list_includes_customer_name(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create(['name' => 'Andi Wijaya']);

        $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Cek pelanggan tampil',
        ]);

        $response = $this->actingAs($cashier)->getJson('/api/v1/service-orders');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.customer.name', 'Andi Wijaya');
    }

    public function test_cashier_can_update_status_as_work_progresses(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        // Explicit OPEN here (e.g. "menunggu part") to verify the manual
        // transition back to IN_PROGRESS still works.
        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
            'status' => 'OPEN',
        ])->json('data.id');

        $response = $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'IN_PROGRESS',
        ]);

        $response->assertStatus(200)->assertJsonPath('data.status', 'IN_PROGRESS');
        $this->assertNull(ServiceOrder::find($orderId)->completed_at);
    }

    public function test_status_cannot_be_set_to_done_manually(): void
    {
        // DONE only ever happens automatically via a paid checkout
        // (CheckoutSaleService) — Design.md §3.2. Manually picking it from
        // the update endpoint must be rejected.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $response = $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'DONE',
        ]);

        $response->assertStatus(422);
        $this->assertSame(ServiceOrder::STATUS_OPEN, ServiceOrder::find($orderId)->status);
    }

    public function test_a_new_order_cannot_be_created_already_done(): void
    {
        // Only "Baru" (OPEN) is allowed at creation; an order can never be
        // born already finished.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $response = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
            'status' => 'DONE',
        ]);

        $response->assertStatus(422);
    }

    public function test_order_is_automatically_marked_done_when_its_linked_sale_is_paid(): void
    {
        // Paying the POS transaction completes the linked order: "Baru" ->
        // "Selesai" (DONE). No manual "Selesai" button is needed.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", [
            'payment_method' => 'CASH', 'paid_amount' => 50000,
        ])->assertStatus(200);

        $order = ServiceOrder::find($orderId);
        $this->assertSame(ServiceOrder::STATUS_DONE, $order->status);
        $this->assertNotNull($order->completed_at);
    }

    public function test_done_order_cannot_be_edited_anymore(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH', 'paid_amount' => 50000]);

        $response = $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'OPEN',
        ]);

        $response->assertStatus(409)->assertJsonPath('code', 'SERVICE_ORDER_LOCKED');
        $this->assertSame(ServiceOrder::STATUS_DONE, ServiceOrder::find($orderId)->status);
    }

    public function test_paid_checkout_does_not_overwrite_a_cancelled_order(): void
    {
        // Terminal states are never overwritten: a CANCELLED order must stay
        // CANCELLED even if a sale against it somehow gets paid.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Batal servis',
        ])->json('data.id');

        $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'CANCELLED',
        ])->assertStatus(200);

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');

        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", [
            'payment_method' => 'CASH', 'paid_amount' => 50000,
        ])->assertStatus(200);

        $order = ServiceOrder::find($orderId);
        $this->assertSame(ServiceOrder::STATUS_CANCELLED, $order->status);
        $this->assertNull($order->completed_at);
    }

    public function test_cashier_can_delete_an_order_without_sale(): void
    {
        // "Hapus" is only offered for orders with no linked transaction.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $this->actingAs($cashier)->deleteJson("/api/v1/service-orders/{$orderId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('service_orders', ['id' => $orderId]);
    }

    public function test_admin_can_delete_an_order_without_sale(): void
    {
        $admin = $this->admin();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($admin)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $this->actingAs($admin)->deleteJson("/api/v1/service-orders/{$orderId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('service_orders', ['id' => $orderId]);
    }

    public function test_order_with_linked_sale_can_be_deleted_and_sale_is_unlinked(): void
    {
        // Deleting an order that backs a transaction is allowed in every
        // status: the sale/receipt stays intact and only the link is cleared.
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['current_stock' => 10]);

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Ganti oli',
        ])->json('data.id');

        $saleId = $this->actingAs($cashier)->postJson('/api/v1/sales', [
            'service_order_id' => $orderId,
            'items' => [['item_type' => 'PRODUCT', 'product_id' => $product->id, 'quantity' => 1]],
        ])->json('data.id');
        $this->actingAs($cashier)->postJson("/api/v1/sales/{$saleId}/checkout", ['payment_method' => 'CASH']);

        $this->actingAs($cashier)->deleteJson("/api/v1/service-orders/{$orderId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('service_orders', ['id' => $orderId]);
        $this->assertDatabaseHas('sales', ['id' => $saleId, 'service_order_id' => null]);
    }

    public function test_cancelled_order_can_be_deleted(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Batal servis',
        ])->json('data.id');

        $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'CANCELLED',
        ])->assertStatus(200);

        $this->actingAs($cashier)->deleteJson("/api/v1/service-orders/{$orderId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('service_orders', ['id' => $orderId]);
    }

    public function test_cancelled_order_cannot_be_edited_anymore(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'complaint' => 'Batal servis',
        ])->json('data.id');

        $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'CANCELLED',
        ])->assertStatus(200);

        $response = $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'status' => 'OPEN',
        ]);

        $response->assertStatus(409)->assertJsonPath('code', 'SERVICE_ORDER_LOCKED');
    }

    public function test_service_order_accepts_and_returns_motorcycle_type(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();

        $orderId = $this->actingAs($cashier)->postJson('/api/v1/service-orders', [
            'customer_id' => $customer->id,
            'motorcycle_type' => 'Yamaha NMAX',
            'complaint' => 'Ganti roller & V-belt',
        ])->assertStatus(201)
            ->assertJsonPath('data.motorcycle_type', 'Yamaha NMAX')
            ->json('data.id');

        $this->assertDatabaseHas('service_orders', [
            'id' => $orderId,
            'motorcycle_type' => 'Yamaha NMAX',
        ]);

        $this->actingAs($cashier)->putJson("/api/v1/service-orders/{$orderId}", [
            'motorcycle_type' => 'Honda Vario 125',
        ])->assertStatus(200)
            ->assertJsonPath('data.motorcycle_type', 'Honda Vario 125');
    }

    public function test_mechanic_master_data_is_selectable_by_both_roles(): void
    {
        Mechanic::factory()->create(['name' => 'Budi']);

        $this->actingAs($this->cashier())->getJson('/api/v1/mechanics')->assertStatus(200);
        $this->actingAs($this->admin())->getJson('/api/v1/mechanics')->assertStatus(200);
    }

    public function test_cashier_cannot_manage_mechanic_master_data(): void
    {
        $cashier = $this->cashier();

        $this->actingAs($cashier)->postJson('/api/v1/mechanics', ['name' => 'Baru'])->assertStatus(403);
    }
}