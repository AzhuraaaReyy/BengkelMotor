<?php

namespace App\Services\Reports;

use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardQueryService
{
    /**Build the admin dashboard KPI block for a given period.
     * `estimated_result` uses the selected period ($from/$to) and must stay in
     * sync with ReportQueryService::finance()'s formula for the same period.
     * `month_*` figures are always the current calendar month, independent of
     * the selected period, matching PRD "omzet/pengeluaran bulan berjalan".
     */
    public function kpi(Carbon $from, Carbon $to): array
    {
        $periodRevenue = Sale::where('status', Sale::STATUS_PAID)
            ->whereBetween('paid_at', [$from, $to])
            ->sum('grand_total');
        $periodCogs = $this->productCogs($from, $to);
        $periodExpenses = Expense::whereBetween(DB::raw('DATE(expense_date)'), [$from->toDateString(), $to->toDateString()])
            ->sum('amount');
        $estimatedResult = bcsub(bcsub((string) $periodRevenue, (string) $periodCogs, 2), (string) $periodExpenses, 2);

        $monthStart = now()->startOfMonth();
        $now = now();
        $monthRevenue = Sale::where('status', Sale::STATUS_PAID)
            ->whereBetween('paid_at', [$monthStart, $now])
            ->sum('grand_total');
        $monthExpenses = Expense::whereBetween(DB::raw('DATE(expense_date)'), [$monthStart->toDateString(), $now->toDateString()])
            ->sum('amount');

        return [
            'today_revenue' => $this->todayRevenue(),
            'today_transactions' => $this->todayTransactions(),
            'today_service_orders' => $this->todayServiceOrders(),
            'today_expenses' => $this->todayExpenses(),
            'month_revenue' => $monthRevenue,
            'month_expenses' => $monthExpenses,
            'estimated_result' => $estimatedResult,
            'low_stock_count' => Product::where('is_active', true)->whereColumn('current_stock', '<=', 'min_stock')->count(),
            'void_count_today' => Sale::where('status', Sale::STATUS_VOID)->whereDate('voided_at', today())->count(),
        ];
    }

    public function revenueChart(Carbon $from, Carbon $to): array
    {
        $rows = Sale::where('status', Sale::STATUS_PAID)
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as day, SUM(grand_total) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        return $rows->map(fn ($r) => [
            'date' => $r->day,
            'revenue' => (float) $r->total,
        ])->values()->toArray();
    }

    public function revenueBreakdown(Carbon $from, Carbon $to): array
    {
        $products = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->sum('sale_items.subtotal');

        $services = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_SERVICE)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->sum('sale_items.subtotal');

        return [
            'products' => (float) $products,
            'services' => (float) $services,
        ];
    }

    public function topProducts(Carbon $from, Carbon $to, int $limit = 5): array
    {
        return SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->selectRaw('sale_items.product_id, sale_items.item_name_snapshot, SUM(sale_items.quantity) as qty, SUM(sale_items.subtotal) as total')
            ->groupBy('sale_items.product_id', 'sale_items.item_name_snapshot')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'product_id' => $r->product_id,
                'name' => $r->item_name_snapshot,
                'total_qty' => (float) $r->qty,
                'total_revenue' => (float) $r->total,
            ])
            ->values()
            ->toArray();
    }

    public function topServices(Carbon $from, Carbon $to, int $limit = 5): array
    {
        return SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_SERVICE)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->selectRaw('sale_items.service_id, sale_items.item_name_snapshot, SUM(sale_items.quantity) as qty, SUM(sale_items.subtotal) as total')
            ->groupBy('sale_items.service_id', 'sale_items.item_name_snapshot')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'service_id' => $r->service_id,
                'name' => $r->item_name_snapshot,
                'total_qty' => (float) $r->qty,
                'total_revenue' => (float) $r->total,
            ])
            ->values()
            ->toArray();
    }

    public function lowStock(int $limit = 10): array
    {
        return Product::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'min_stock')
            ->orderBy('current_stock')
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
                'unit' => $p->unit,
            ])
            ->values()
            ->toArray();
    }

    public function recentSales(int $limit = 5): array
    {
        return Sale::with('cashier:id,name')
            ->where('status', Sale::STATUS_PAID)
            ->orderByDesc('paid_at')
            ->limit($limit)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'sale_code' => $s->sale_code,
                'status' => $s->status,
                'grand_total' => $s->grand_total,
                'payment_method' => $s->payment_method,
                'paid_at' => $s->paid_at,
                'cashier' => $s->cashier ? ['id' => $s->cashier->id, 'name' => $s->cashier->name] : null,
            ])
            ->values()
            ->toArray();
    }

    public function recentVoids(int $limit = 5): array
    {
        return Sale::with('cashier:id,name')
            ->where('status', Sale::STATUS_VOID)
            ->orderByDesc('voided_at')
            ->limit($limit)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'sale_code' => $s->sale_code,
                'status' => $s->status,
                'grand_total' => $s->grand_total,
                'void_reason' => $s->void_reason,
                'voided_at' => $s->voided_at,
                'cashier' => $s->cashier ? ['id' => $s->cashier->id, 'name' => $s->cashier->name] : null,
            ])
            ->values()
            ->toArray();
    }

    private function productCogs(Carbon $from, Carbon $to): string
    {
        return SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(sale_items.purchase_price_snapshot * sale_items.quantity), 0) as cogs')
            ->value('cogs') ?? '0';
    }

    private function todayRevenue(): string
    {
        return Sale::where('status', Sale::STATUS_PAID)
            ->whereDate('paid_at', today())
            ->sum('grand_total');
    }

    private function todayExpenses(): string
    {
        return Expense::whereDate('expense_date', today())->sum('amount');
    }

    private function todayTransactions(): int
    {
        return Sale::where('status', Sale::STATUS_PAID)->whereDate('paid_at', today())->count();
    }

    private function todayServiceOrders(): int
    {
        return ServiceOrder::whereDate('opened_at', today())->count();
    }
}
