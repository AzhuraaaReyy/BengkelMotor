<?php

namespace App\Services\Sales;

use App\Models\AuditLog;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Audit\AuditService;
use App\Services\Inventory\StockLedger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class VoidSaleService
{
    public function __construct(
        private AuditService $audit,
        private StockLedger $ledger,
    ) {}

    /**Admin-only void of a PAID sale. Atomically marks sale VOID, restores
     * stock via VOID_RETURN movements, and writes an audit log.
     */
    public function void(Sale $sale, string $reason): Sale
    {
        $user = Auth::user();
        if (!$user instanceof User) {
            throw new RuntimeException('Unauthenticated.', 401);
        }
        if (!$user->isAdmin()) {
            throw new RuntimeException('Only Admin can void a paid sale.', 403);
        }
        if (trim($reason) === '') {
            throw new RuntimeException('Void reason is required.', 422);
        }
        if ($sale->status !== Sale::STATUS_PAID) {
            throw new RuntimeException('Only PAID sales can be voided.', 409);
        }

        return DB::transaction(function () use ($sale, $reason, $user) {
            // Lock the sale header row and re-verify status inside the lock so two
            // concurrent void requests for the same sale cannot both proceed
            // (prevents double VOID_RETURN stock movements).
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status !== Sale::STATUS_PAID) {
                throw new RuntimeException('Only PAID sales can be voided.', 409);
            }

            $sale->load(['items' => fn($q) => $q->where('item_type', SaleItem::TYPE_PRODUCT)]);

            $sale->status = Sale::STATUS_VOID;
            $sale->voided_at = now();
            $sale->voided_by = $user->id;
            $sale->void_reason = $reason;
            $sale->save();

            $this->ledger->incrementForSale($sale, $sale->items, $user->id, StockMovement::TYPE_VOID_RETURN);

            $this->audit->log(
                AuditLog::ACTION_SALE_VOIDED,
                'sale',
                $sale->id,
                null,
                [
                    'sale_code' => $sale->sale_code,
                    'grand_total' => $sale->grand_total,
                    'status' => $sale->status,
                ],
                $reason,
                $user->id
            );

            $sale->refresh();
            return $sale;
        }, 5);
    }
}
