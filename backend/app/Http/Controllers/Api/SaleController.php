<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Sales\CheckoutSaleService;
use App\Services\Sales\VoidSaleService;
use App\Support\CodeGenerator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SaleController extends Controller
{
    public function __construct(
        private CheckoutSaleService $checkoutService,
        private VoidSaleService $voidService
    ) {}

    public function index(Request $request)
    {
        $sales = Sale::with(['cashier:id,name', 'customer:id,name'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->search, function ($q, $s) {
                $q->where('sale_code', 'like', "%{$s}%");
            })
            ->orderByDesc('created_at')
            ->paginate(15)
            ->through(fn (Sale $sale) => new SaleResource($sale));

        return response()->json(['data' => $sales]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            // A service order can only ever back one sale (sales.service_order_id
            // is unique in the schema) — reject the duplicate here with a clean
            // 422 instead of letting it fall through to a raw DB constraint error.
            'service_order_id' => ['nullable', 'exists:service_orders,id', Rule::unique('sales', 'service_order_id')],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'in:PRODUCT,SERVICE'],
            'items.*.product_id' => ['required_if:items.*.item_type,PRODUCT', 'nullable', 'exists:products,id'],
            'items.*.service_id' => ['required_if:items.*.item_type,SERVICE', 'nullable', 'exists:services,id'],
            // Quantities are whole numbers only (Fase 3).
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sale = Sale::create([
            'sale_code' => CodeGenerator::saleCode(),
            'cashier_id' => $request->user()->id,
            'customer_id' => $request->customer_id,
            'service_order_id' => $request->service_order_id,
            'status' => Sale::STATUS_DRAFT,
            'subtotal' => 0,
            'discount_amount' => 0,
            'grand_total' => 0,
        ]);

        foreach ($request->items as $item) {
            $name = null;
            $code = null;
            if ($item['item_type'] === SaleItem::TYPE_PRODUCT) {
                $product = \App\Models\Product::find($item['product_id']);
                $name = $product->name;
                $code = $product->sku;
            } else {
                $service = \App\Models\Service::find($item['service_id']);
                $name = $service->name;
                $code = $service->code;
            }

            $sale->items()->create([
                'item_type' => $item['item_type'],
                'product_id' => $item['item_type'] === SaleItem::TYPE_PRODUCT ? $item['product_id'] : null,
                'service_id' => $item['item_type'] === SaleItem::TYPE_SERVICE ? $item['service_id'] : null,
                'item_code_snapshot' => $code,
                'item_name_snapshot' => $name,
                'quantity' => $item['quantity'],
                'unit_price' => 0, // computed at checkout
                'subtotal' => 0,
            ]);
        }

        $sale->load(['items', 'cashier:id,name', 'customer:id,name']);

        return response()->json(['data' => new SaleResource($sale), 'message' => 'Transaksi dibuat.'], 201);
    }

    public function show(Sale $sale)
    {
        $sale->load(['items', 'cashier:id,name', 'customer:id,name']);
        return response()->json(['data' => new SaleResource($sale)]);
    }

    public function update(Request $request, Sale $sale)
    {
        if ($sale->status !== Sale::STATUS_DRAFT) {
            throw ValidationException::withMessages(['status' => ['Only DRAFT sales can be edited.']]);
        }

$request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            // min:1 when present: an update must never leave a DRAFT sale
            // with zero items — that would let checkout() turn it into a
            // PAID transaction with nothing actually sold (see the matching
            // guard in CheckoutSaleService::checkout()).
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.item_type' => ['in:PRODUCT,SERVICE'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.quantity' => ['integer', 'min:1'],
        ]);

        $sale->update($request->only(['customer_id']));

        if ($request->has('items')) {
            $sale->items()->delete();
            foreach ($request->items as $item) {
                $name = null;
                $code = null;
                if ($item['item_type'] === SaleItem::TYPE_PRODUCT) {
                    $product = \App\Models\Product::find($item['product_id']);
                    $name = $product->name;
                    $code = $product->sku;
                } else {
                    $service = \App\Models\Service::find($item['service_id']);
                    $name = $service->name;
                    $code = $service->code;
                }
                $sale->items()->create([
                    'item_type' => $item['item_type'],
                    'product_id' => $item['item_type'] === SaleItem::TYPE_PRODUCT ? $item['product_id'] : null,
                    'service_id' => $item['item_type'] === SaleItem::TYPE_SERVICE ? $item['service_id'] : null,
                    'item_code_snapshot' => $code,
                    'item_name_snapshot' => $name,
                    'quantity' => $item['quantity'],
                    'unit_price' => 0,
                    'subtotal' => 0,
                ]);
            }
        }

        $sale->load(['items', 'cashier:id,name', 'customer:id,name']);
        return response()->json(['data' => new SaleResource($sale), 'message' => 'Transaksi diperbarui.']);
    }

    public function checkout(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'in:CASH,QRIS,VA,GOPAY'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'service_order_id' => [
                'nullable',
                'exists:service_orders,id',
                Rule::unique('sales', 'service_order_id')->ignore($sale->id),
            ],
        ]);

        try {
            $paid = $this->checkoutService->checkout(
                $sale,
                $validated['payment_method'],
                $validated['paid_amount'] ?? null,
                $validated['discount_amount'] ?? 0,
                $validated['customer_id'] ?? null,
                $validated['service_order_id'] ?? null,
            );

            $paid->load(['items', 'cashier:id,name', 'customer:id,name']);
            return response()->json(['data' => new SaleResource($paid), 'message' => 'Pembayaran berhasil.']);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'CHECKOUT_FAILED',
                'errors' => [],
            ], $e->getCode() ?: 422);
        }
    }

    public function void(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $voided = $this->voidService->void($sale, $validated['reason']);
            $voided->load(['items', 'cashier:id,name', 'customer:id,name']);
            return response()->json(['data' => new SaleResource($voided), 'message' => 'Transaksi berhasil di-void.']);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'VOID_FAILED',
                'errors' => [],
            ], $e->getCode() ?: 422);
        }
    }
}
