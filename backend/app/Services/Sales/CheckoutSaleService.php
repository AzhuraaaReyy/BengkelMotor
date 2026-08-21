<?php

namespace App\Services\Sales;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use App\Models\StockMovement;
use App\Services\Audit\AuditService;
use App\Services\Inventory\StockLedger;
use App\Services\Payments\PaymentService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CheckoutSaleService
{
    public function __construct(
        private AuditService $audit,
        private PaymentService $paymentService,
        private StockLedger $ledger,
    ) {}

    /**
     * Atomically finalize a DRAFT sale into PAID.
     * Locks product rows, validates stock, computes totals server-side,
     * snapshots prices, creates SALE stock movements and decrements stock.
     *
     * @throws RuntimeException|ValidationException
     */
    public function checkout(Sale $sale, string $paymentMethod, ?float $paidAmount, float $discountAmount, ?int $customerId = null, ?int $serviceOrderId = null): Sale
    {
        if ($sale->status !== Sale::STATUS_DRAFT) {
            throw new RuntimeException('Only DRAFT sales can be checked out.', 409);
        }

        if ($discountAmount < 0) {
            throw new RuntimeException('Discount cannot be negative.', 422);
        }

        return DB::transaction(function () use ($sale, $paymentMethod, $paidAmount, $discountAmount, $customerId, $serviceOrderId) {
            // Lock the sale header row and re-verify status inside the lock so two
            // concurrent checkout requests for the same sale cannot both proceed
            // (prevents double PAID transition / duplicate SALE stock movements).
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status !== Sale::STATUS_DRAFT) {
                throw new RuntimeException('Only DRAFT sales can be checked out.', 409);
            }

            $sale->load('items');

            // A sale with zero items would become a PAID transaction with no
            // actual product/service behind it ("data halu") — items are
            // normally guaranteed at creation (store() requires min:1), but
            // update() can still empty out a DRAFT sale's items afterwards,
            // so this is re-checked here as the final gate before PAID.
            if ($sale->items->isEmpty()) {
                throw new RuntimeException('Transaksi tidak boleh kosong. Tambahkan minimal satu produk atau jasa sebelum melakukan pembayaran.', 422);
            }

            // Lock product rows involved in this sale to prevent race conditions.
            $productIds = $sale->items
                ->where('item_type', SaleItem::TYPE_PRODUCT)
                ->pluck('product_id')
                ->filter()
                ->unique();

            $lockedProducts = collect();
            if ($productIds->isNotEmpty()) {
                $lockedProducts = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');
            }

            $subtotal = 0;
            $items = [];

            foreach ($sale->items as $item) {
                if ($item->item_type === SaleItem::TYPE_PRODUCT) {
                    $product = $lockedProducts->get($item->product_id);
                    if (!$product) {
                        throw new RuntimeException('Product not found.', 404);
                    }
                    if (!$product->is_active) {
                        throw new RuntimeException("Product {$product->name} is inactive.", 422);
                    }
                    if ($product->current_stock < $item->quantity) {
                        throw new RuntimeException(
                            "Stock is insufficient for {$product->name}.",
                            409
                        );
                    }
                    $unitPrice = $product->sale_price;
                    $purchasePrice = $product->purchase_price;
                } else {
                    $service = $item->service;
                    if (!$service || !$service->is_active) {
                        throw new RuntimeException('Service is not available.', 422);
                    }
                    $unitPrice = $service->sale_price;
                    $purchasePrice = null;
                }

                $lineSubtotal = bcmul((string) $item->quantity, (string) $unitPrice, 2);
                $subtotal = bcadd((string) $subtotal, $lineSubtotal, 2);

                $items[] = [
                    'item' => $item,
                    'unitPrice' => $unitPrice,
                    'purchasePrice' => $purchasePrice,
                    'lineSubtotal' => $lineSubtotal,
                    'product' => $item->item_type === SaleItem::TYPE_PRODUCT ? $lockedProducts->get($item->product_id) : null,
                ];
            }

            if ($discountAmount > $subtotal) {
                throw new RuntimeException('Discount cannot exceed subtotal.', 422);
            }

            $grandTotal = bcsub((string) $subtotal, (string) $discountAmount, 2);

            // Resolve cashier from authenticated user (server-side), never from request.
            $cashier = auth()->user();
            if (!$cashier) {
                throw new RuntimeException('Unauthenticated.', 401);
            }

            // Persist item snapshots.
            foreach ($items as $idx) {
                $item = $idx['item'];
                $item->unit_price = $idx['unitPrice'];
                $item->purchase_price_snapshot = $item->item_type === SaleItem::TYPE_PRODUCT ? $idx['purchasePrice'] : null;
                $item->subtotal = $idx['lineSubtotal'];
                $item->save();
            }

            // Update sale header.
            $sale->subtotal = $subtotal;
            $sale->discount_amount = $discountAmount;
            $sale->grand_total = $grandTotal;
            $sale->payment_method = $paymentMethod;
            $sale->cashier_id = $cashier->id;
            $sale->customer_id = $customerId ?? $sale->customer_id;
            $sale->service_order_id = $serviceOrderId ?? $sale->service_order_id;

            // A sale linked to a service order should carry that order's
            // customer too — the POS flow only ever sends service_order_id
            // (the Kasir already picked the customer when the order was
            // opened), so backfill here instead of leaving the sale's
            // customer null and the receipt blank.
            if ($sale->service_order_id && !$sale->customer_id) {
                $linkedOrder = ServiceOrder::find($sale->service_order_id);
                if ($linkedOrder) {
                    $sale->customer_id = $linkedOrder->customer_id;
                }
            }

            $sale->save();

            // Online method: delegate to PaymentService (creates charge, sets PENDING, reserves stock).
            if (in_array($paymentMethod, Sale::ONLINE_METHODS, true)) {
                return $this->paymentService->startOnlinePayment($sale, $paymentMethod);
            }

            // Cash path: set PAID and decrement stock immediately.
            $sale->status = Sale::STATUS_PAID;
            $sale->paid_at = now();

            if ($paidAmount !== null) {
                $sale->paid_amount = $paidAmount;
                $sale->change_amount = max(0, bcsub((string) $paidAmount, (string) $grandTotal, 2));
            }

            $sale->save();

            $this->ledger->decrementForSale($sale, $sale->items->where('item_type', SaleItem::TYPE_PRODUCT), $cashier->id, StockMovement::TYPE_SALE);

            // Auto-complete the linked service order when its transaction is
            // paid: order "Baru" -> "Selesai" (DONE). DONE is only ever set
            // here, never chosen manually — see ServiceOrderController::update.
            // Terminal states (DONE/CANCELLED) are never overwritten.
            if ($sale->service_order_id) {
                $serviceOrder = ServiceOrder::whereKey($sale->service_order_id)->lockForUpdate()->first();
                if ($serviceOrder && !in_array($serviceOrder->status, [ServiceOrder::STATUS_DONE, ServiceOrder::STATUS_CANCELLED], true)) {
                    $serviceOrder->status = ServiceOrder::STATUS_DONE;
                    $serviceOrder->completed_at = now();
                    $serviceOrder->save();
                }
            }

            // Audit log.
            $this->audit->log(
                AuditLog::ACTION_SALE_CHECKOUT,
                'sale',
                $sale->id,
                null,
                [
                    'sale_code' => $sale->sale_code,
                    'grand_total' => $sale->grand_total,
                    'status' => $sale->status,
                ]
            );

            $sale->refresh();
            return $sale;
        }, 5);
    }
}
