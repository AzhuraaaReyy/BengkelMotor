<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\PaymentCharge;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\Payments\Contracts\PaymentGateway;
use App\Services\Payments\DTO\GatewayNotification;
use App\Services\Payments\Gateways\FakePaymentGateway;
use App\Services\Payments\PaymentService;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    private FakePaymentGateway $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->fake);
    }

    private function draftSaleWithProduct(): Sale
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $product = Product::factory()->create(['current_stock' => 10, 'sale_price' => 1000]);
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 2,
            'unit_price' => 1000,
            'subtotal' => 2000,
        ]);
        $sale->update(['subtotal' => 2000, 'grand_total' => 2000]);
        return $sale->fresh();
    }

    public function test_start_online_payment_sets_pending_and_reserves_stock_once(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);

        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $this->assertSame(Sale::STATUS_PENDING, $result->status);
        $this->assertSame('QRIS', $result->payment_method);
        $charge = $result->paymentCharges()->first();
        $this->assertNotNull($charge);
        $this->assertSame(PaymentCharge::STATUS_PENDING, $charge->status);
        $this->assertSame('2000.00', (string) $charge->amount);
        $this->assertNotNull($charge->qr_url);
        $this->assertNotNull($charge->expires_at);
        $this->assertSame(1, PaymentCharge::where('sale_id', $sale->id)->count());
        $product->refresh();
        $this->assertSame(8, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $sale->id)->where('type', StockMovement::TYPE_SALE)->count());
    }

    public function test_start_online_payment_rejects_non_draft_sale(): void
    {
        $sale = $this->draftSaleWithProduct();
        $sale->update(['status' => Sale::STATUS_PAID]);

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
    }

    public function test_settle_turns_sale_and_charge_paid_without_stock_change(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $notification = new GatewayNotification(
            orderId: $result->sale_code,
            status: 'PAID',
            grossAmount: '2000.00',
            gatewayTransactionId: 'TX-QRIS-' . $result->id,
        );
        $settled = app(PaymentService::class)->settleFromGateway($notification);

        $this->assertSame(Sale::STATUS_PAID, $settled->status);
        $charge = $settled->paymentCharges()->first();
        $this->assertSame(PaymentCharge::STATUS_PAID, $charge->status);
        $this->assertNotNull($charge->paid_at);
        $product->refresh();
        $this->assertSame(8, $product->current_stock);
    }

    public function test_expire_turns_sale_and_charge_expired_and_restores_stock(): void
    {
        $sale = $this->draftSaleWithProduct();
        $product = Product::find($sale->items->first()->product_id);
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');

        $expired = app(PaymentService::class)->expire($result, 'Test expire');

        $this->assertSame(Sale::STATUS_EXPIRED, $expired->status);
        $charge = $expired->paymentCharges()->first();
        $this->assertSame(PaymentCharge::STATUS_EXPIRED, $charge->status);
        $product->refresh();
        $this->assertSame(10, $product->current_stock);
        $this->assertSame(1, StockMovement::where('sale_id', $expired->id)->where('type', StockMovement::TYPE_SALE_REVERSAL)->count());
    }

    public function test_settle_is_idempotent_for_already_paid_sale(): void
    {
        $sale = $this->draftSaleWithProduct();
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
        $notification = new GatewayNotification(orderId: $result->sale_code, status: 'PAID', grossAmount: '2000.00', gatewayTransactionId: 'TX-QRIS-' . $result->id);
        app(PaymentService::class)->settleFromGateway($notification);

        $settledAgain = app(PaymentService::class)->settleFromGateway($notification);
        $this->assertSame(Sale::STATUS_PAID, $settledAgain->status);
    }

    public function test_settle_rejects_amount_mismatch(): void
    {
        $sale = $this->draftSaleWithProduct();
        $result = app(PaymentService::class)->startOnlinePayment($sale, 'QRIS');
        $notification = new GatewayNotification(orderId: $result->sale_code, status: 'PAID', grossAmount: '99999.00', gatewayTransactionId: 'TX-QRIS-' . $result->id);

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->settleFromGateway($notification);
    }

    public function test_settle_rejects_unknown_order(): void
    {
        $notification = new GatewayNotification(orderId: 'UNKNOWN', status: 'PAID', grossAmount: '2000.00', gatewayTransactionId: 'TX-999');

        $this->expectException(\RuntimeException::class);
        app(PaymentService::class)->settleFromGateway($notification);
    }
}
