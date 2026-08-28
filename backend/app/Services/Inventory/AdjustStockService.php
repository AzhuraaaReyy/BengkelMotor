<?php

namespace App\Services\Inventory;

use App\Models\AuditLog;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Audit\AuditService;
use App\Services\Notifications\StockNotificationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdjustStockService
{
    public function __construct(
        private AuditService $audit,
        private StockNotificationService $stockNotification
    ) {}

    /**
     * Stock adjustment for any authenticated user (Admin & Cashier — Fase 3:
     * "kasir kelola stok"). Input is the signed quantity CHANGE (delta):
     *   stock_after = stock_before + $change.
     *
     * Type semantics:
     *   - PURCHASE  : stock-in/restock, $change must be > 0.
     *   - ADJUSTMENT: correction (opname/loss/correction), signed delta.
     *   - OPENING   : initial stock.
     *
     * Stock adjustment records stock movement only. Expenses are managed
     * manually by Admin through Expense Management.
     */
    public function adjust(Product $product, int|float $change, string $type, string $note): Product
    {
        $user = auth()->user();
        if (!$user) {
            throw new RuntimeException('Unauthenticated.', 401);
        }
        if (trim($note) === '') {
            throw new RuntimeException('Note is required for stock adjustment.', 422);
        }
        // Whole numbers only (Rules.md §7). A float that is not an integer is
        // rejected instead of silently truncated by PHP's type coercion.
        if ($change != (int) $change) {
            throw new RuntimeException('Stock quantity must be a whole number.', 422);
        }
        $change = (int) $change;
        if ($change == 0) {
            throw new RuntimeException('No stock change.', 422);
        }
        if ($type === StockMovement::TYPE_PURCHASE && $change < 0) {
            throw new RuntimeException('Purchased quantity cannot be negative.', 422);
        }

        return DB::transaction(function () use ($product, $change, $type, $note, $user) {
            // Lock the product row so two concurrent adjustments cannot both
            // read the same stale current_stock and overwrite each other.
            $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            $before = (int) $product->current_stock;
            $after = $before + $change;
            if ($after < 0) {
                throw new RuntimeException('Stock cannot go below zero.', 422);
            }

            $product->current_stock = $after;
            $product->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity_change' => $change,
                'stock_before' => $before,
                'stock_after' => $after,
                'created_by' => $user->id,
                'note' => $note,
                'created_at' => now(),
            ]);

            $this->audit->log(
                $type === StockMovement::TYPE_OPENING ? AuditLog::ACTION_STOCK_PURCHASE : AuditLog::ACTION_STOCK_ADJUSTMENT,
                'product',
                $product->id,
                ['current_stock' => $before],
                ['current_stock' => $after],
                $note,
                $user->id
            );

            $product = $product->refresh();
            $this->checkStockNotification($product, (int) $product->current_stock);

            return $product;
        }, 5);
    }

    private function checkStockNotification(Product $product, int $currentStock): void
    {
        $this->stockNotification->check($product, $currentStock);
    }

}