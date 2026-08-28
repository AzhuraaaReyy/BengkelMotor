<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Audit\AuditService;
use App\Services\Inventory\AdjustStockService;
use App\Services\Notifications\StockNotificationService;
use App\Support\CodeGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use RuntimeException;

class ProductController extends Controller
{
    public function __construct(
        private AdjustStockService $adjustStock,
        private AuditService $audit,
        private StockNotificationService $stockNotification
    ) {}

    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->search) {
            $sanitized = str_replace(['%', '_'], ['\\%', '\\_'], $request->search);
            $query->where(fn($q) => $q->where('name', 'like', "%{$sanitized}%")
                ->orWhere('sku', 'like', "%{$sanitized}%"));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_stock', '<=', 'min_stock');
        }

        // POS catalog requests all items (per_page=200 / all=1), while the
        // management table paginates (per_page=15). Honor the request with a
        // hard cap so a huge catalog cannot be dumped in one response.
        $perPage = $request->boolean('all')
            ? 1000
            : min(max($request->integer('per_page', 15), 1), 500);

        $products = $query->orderBy('name')->paginate($perPage)
            ->through(fn (Product $product) => new ProductResource($product));

        return response()->json(['data' => $products]);
    }

    public function show(Product $product)
    {
        $product->load([
            'stockMovements' => fn($q) => $q
                ->with(['createdBy:id,name', 'sale:id,sale_code', 'expense:id,stock_movement_id,amount'])
                ->orderByDesc('created_at')
                ->limit(50),
        ]);
        return response()->json([
            'data' => new ProductResource($product),
            'stock_movements' => $product->stockMovements
                ->map(fn($m) => $this->movementPayload($m)),
        ]);
    }

    public function movements(Request $request, Product $product)
    {
        $movements = $product->stockMovements()
            ->with(['createdBy:id,name', 'sale:id,sale_code', 'expense:id,stock_movement_id,amount'])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20))
            ->through(fn (StockMovement $m) => $this->movementPayload($m));

        return response()->json(['data' => $movements]);
    }

    /**
     * Low/out-of-stock products for the notification bell & banner
     * (Fase 3.2). Threshold is a fixed minimum of 5 units (current_stock < 5)
     * and applies to the stock notification ONLY — the product table badge
     * and dashboard low-stock still use each product's own min_stock.
     */
    public function lowStock(Request $request)
    {
        $limit = min(max($request->integer('limit', 100), 1), 500);

        $products = Product::where('is_active', true)
            ->where('current_stock', '<', 5)
            ->orderBy('current_stock')
            ->limit($limit)
            ->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
                'unit' => $p->unit,
                'is_out' => $p->current_stock === 0,
            ]);

        $items = $products->values();

        return response()->json([
            'data' => $items,
            'counts' => [
                'out_of_stock' => $items->where('is_out', true)->count(),
                'low' => $items->where('is_out', false)->count(),
                'total' => $items->count(),
            ],
        ]);
    }

    private function movementDirection(StockMovement $m): string
    {
        return match ($m->type) {
            StockMovement::TYPE_SALE => 'OUT',
            StockMovement::TYPE_ADJUSTMENT => $m->quantity_change > 0 ? 'IN' : 'OUT',
            default => 'IN', // OPENING, PURCHASE, VOID_RETURN always add stock
        };
    }

    private function movementPayload(StockMovement $m): array
    {
        return [
            'id' => $m->id,
            'type' => $m->type,
            'direction' => $this->movementDirection($m),
            'quantity_change' => $m->quantity_change,
            'stock_before' => $m->stock_before,
            'stock_after' => $m->stock_after,
            'sale_id' => $m->sale_id,
            'sale_code' => $m->sale?->sale_code,
            'created_by' => $m->created_by,
            'created_by_name' => $m->createdBy?->name,
            'note' => $m->note,
            'created_at' => $m->created_at,
            // Nullable legacy value for historical STOCK_PURCHASE expenses.
            'expense_amount' => $m->expense?->amount,
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:100'],
            'brand' => ['nullable', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:30'],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            // Stock is whole numbers only (Fase 3).
            'current_stock' => ['nullable', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'image' => ['nullable', 'file', 'image', 'max:5120', 'dimensions:max_width=1024,max_height=1024'],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'sku' => CodeGenerator::sku($validated['name']),
            'name' => $validated['name'],
            'category' => $validated['category'] ?? null,
            'brand' => $validated['brand'] ?? null,
            'unit' => $validated['unit'],
            'purchase_price' => $validated['purchase_price'],
            'sale_price' => $validated['sale_price'],
            'current_stock' => $validated['current_stock'] ?? 0,
            'min_stock' => $validated['min_stock'] ?? 0,
            'is_active' => true,
            'image' => $imagePath,
        ]);

        // Record opening stock movement if initial stock > 0.
        if (($validated['current_stock'] ?? 0) > 0) {
            StockMovement::create([
                'product_id' => $product->id,
                'type' => StockMovement::TYPE_OPENING,
                'quantity_change' => $validated['current_stock'],
                'stock_before' => 0,
                'stock_after' => $validated['current_stock'],
                'created_by' => $request->user()->id,
                'note' => 'Stok awal',
                'created_at' => now(),
            ]);
        }

        $this->audit->log(
            \App\Models\AuditLog::ACTION_PRODUCT_CREATED,
            'product',
            $product->id,
            null,
            ['name' => $product->name, 'sku' => $product->sku]
        );

        // Stok awal di bawah threshold harus langsung menaikkan notifikasi
        // stok, sama seperti jalur penjualan dan Atur Stok.
        if ($product->current_stock < 5) {
            $this->stockNotification->check($product, (int) $product->current_stock);
        }

        return response()->json(['data' => new ProductResource($product), 'message' => 'Produk dibuat.'], 201);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:100'],
            'brand' => ['nullable', 'string', 'max:100'],
            'unit' => ['sometimes', 'string', 'max:30'],
            'purchase_price' => ['sometimes', 'numeric', 'min:0'],
            'sale_price' => ['sometimes', 'numeric', 'min:0'],
            // Stock is whole numbers only (Fase 3).
            'min_stock' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'max:5120', 'dimensions:max_width=1024,max_height=1024'],
        ]);

        // current_stock cannot be changed via master update (must use adjustment endpoint).
        $before = $product->only(['name', 'sale_price', 'purchase_price', 'min_stock', 'is_active', 'image']);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image) {
                \Storage::disk('public')->delete($product->image);
            }
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($validated);

        $this->audit->log(
            \App\Models\AuditLog::ACTION_PRODUCT_UPDATED,
            'product',
            $product->id,
            $before,
            $product->only(['name', 'sale_price', 'purchase_price', 'min_stock', 'is_active'])
        );

        return response()->json(['data' => new ProductResource($product), 'message' => 'Produk diperbarui.']);
    }

    public function adjustStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            // quantity is the signed CHANGE (delta), not the absolute target
            // (Fase 3.3). PURCHASE requires a positive amount; ADJUSTMENT may
            // be negative (loss/correction). Zero is rejected by the service.
            'quantity' => ['required', 'integer', Rule::when($request->input('type') === 'PURCHASE', 'min:1')],
            'type' => ['required', 'in:OPENING,PURCHASE,ADJUSTMENT'],
            'note' => ['required', 'string', 'max:500'],
        ]);

        try {
            $product = $this->adjustStock->adjust(
                $product,
                (int) $validated['quantity'],
                $validated['type'],
                $validated['note']
            );
            return response()->json(['data' => new ProductResource($product), 'message' => 'Stok disesuaikan.']);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'STOCK_ADJUST_FAILED', 'errors' => []], $e->getCode() ?: 422);
        }
    }
}


