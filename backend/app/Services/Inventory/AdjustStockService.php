<?php

namespace App\Services\Inventory;

use App\Models\AuditLog;
use App\Models\Expense;
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
     * Type semantics (Fase 3.3):
     *   - PURCHASE  : paid restock, $change must be > 0. Creates an Expense
     *                 (amount = $change × product.purchase_price) in the same
     *                 DB transaction, linked via stock_movements.id. No expense
     *                 is created when purchase_price is 0.
     *   - ADJUSTMENT: non-purchase correction (opname/loss/correction), signed
     *                 delta, NEVER touches expenses.
     *   - OPENING   : initial stock, no expense.
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

            $movement = StockMovement::create([
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

            if ($type === StockMovement::TYPE_PURCHASE && $product->purchase_price > 0) {
                $this->createPurchaseExpense($product, $movement, $change, $note, $user);
            }

            $product = $product->refresh();
            $this->checkStockNotification($product, (int) $product->current_stock);

            return $product;
        }, 5);
    }

    private function checkStockNotification(Product $product, int $currentStock): void
    {
        $this->stockNotification->check($product, $currentStock);
    }

    private function createPurchaseExpense(
        Product $product,
        StockMovement $movement,
        int $change,
        string $note,
        $user
    ): void {
        $unitPrice = $product->purchase_price;
        $total = bcmul((string) $change, (string) $unitPrice, 2);

        $expense = Expense::create([
            'expense_date' => now()->toDateString(),
            'category' => 'Pembelian Stok',
            'amount' => $total,
            'description' => sprintf(
                'Pembelian stok: %s — %d %s × %s = %s%s',
                $product->name,
                $change,
                $product->unit,
                $this->rupiah($unitPrice),
                $this->rupiah($total),
                $note !== '' ? " ({$note})" : ''
            ),
            'created_by' => $user->id,
            'source' => 'STOCK_PURCHASE',
            'stock_movement_id' => $movement->id,
            'item_name' => $product->name,
            'quantity' => $change,
            'unit_price' => $unitPrice,
        ]);

        $this->audit->log(
            AuditLog::ACTION_EXPENSE_CREATED,
            'expense',
            $expense->id,
            null,
            ['category' => $expense->category, 'amount' => $expense->amount, 'expense_date' => $expense->expense_date, 'source' => 'STOCK_PURCHASE'],
            'Otomatis dari restock ' . $movement->type,
            $user->id
        );
    }

    private function rupiah(float|string $value): string
    {
        return 'Rp' . number_format((float) $value, 0, ',', '.');
    }
}