<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Services\Notifications\StockNotificationService;
use Illuminate\Support\Collection;
use RuntimeException;

class StockLedger
{
    public function __construct(private StockNotificationService $stockNotification) {}

    public function decrementForSale(Sale $sale, Collection $productItems, int $userId, string $type): void
    {
        $productIds = $productItems->pluck('product_id')->filter()->unique();
        $locked = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
            : collect();

        foreach ($productItems as $item) {
            $product = $locked->get($item->product_id);
            if (!$product) {
                throw new RuntimeException("Product ID {$item->product_id} not found during stock operation.", 404);
            }

            $before = $product->current_stock;
            $after = bcsub((string) $before, (string) $item->quantity, 0);
            if ($after < 0) {
                throw new RuntimeException("Stock is insufficient for {$product->name}.", 409);
            }
            $product->current_stock = $after;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity_change' => '-' . $item->quantity,
                'stock_before' => $before,
                'stock_after' => $after,
                'sale_id' => $sale->id,
                'created_by' => $userId,
                'created_at' => now(),
            ]);
        }

        foreach ($productItems as $item) {
            $product = $locked->get($item->product_id);
            if ($product) {
                $this->stockNotification->check($product);
            }
        }
    }

    public function incrementForSale(Sale $sale, Collection $productItems, int $userId, string $type): void
    {
        $productIds = $productItems->pluck('product_id')->filter()->unique();
        $locked = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
            : collect();

        foreach ($productItems as $item) {
            $product = $locked->get($item->product_id);
            if (!$product) {
                throw new RuntimeException("Product ID {$item->product_id} not found during stock operation.", 404);
            }

            $before = $product->current_stock;
            $after = bcadd((string) $before, (string) $item->quantity, 0);
            $product->current_stock = $after;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity_change' => '+' . $item->quantity,
                'stock_before' => $before,
                'stock_after' => $after,
                'sale_id' => $sale->id,
                'created_by' => $userId,
                'created_at' => now(),
            ]);
        }
    }
}
