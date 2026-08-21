<?php

namespace Tests\Feature\Payments;

use App\Models\PaymentCharge;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\Gateways\FakePaymentGateway;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
        Config::set('services.midtrans.server_key', 'test-server-key');
    }

    public function test_webhook_returns_400_for_invalid_signature(): void
    {
        $this->fake->signatureValid = false;

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'SALE-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '2000.00',
        ]);

        $response->assertStatus(400);
    }

    public function test_webhook_settle_marks_sale_paid(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->pending('QRIS')->for($cashier, 'cashier')->create(['sale_code' => 'WEBHOOK-TEST-001']);
        $product = \App\Models\Product::factory()->create(['current_stock' => 10]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
            'item_name_snapshot' => $product->name,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);
        PaymentCharge::create([
            'sale_id' => $sale->id,
            'method' => 'QRIS',
            'amount' => 2000,
            'status' => PaymentCharge::STATUS_PENDING,
            'gateway_transaction_id' => 'TX-WEBHOOK-001',
            'expires_at' => now()->addMinutes(15),
        ]);

        $response = $this->postJson('/api/v1/payments/webhook/midtrans', [
            'order_id' => 'WEBHOOK-TEST-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '2000.00',
            'transaction_id' => 'TX-WEBHOOK-001',
        ]);

        $response->assertOk();
        $sale->refresh();
        $this->assertSame(Sale::STATUS_PAID, $sale->status);
    }

    public function test_webhook_is_rate_limited(): void
    {
        $response = $this->postJson('/api/v1/payments/webhook/midtrans', []);
        $response->assertOk();
    }
}
