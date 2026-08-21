<?php

namespace App\Services\Reports;

use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportQueryService
{
    public function sales(Carbon $from, Carbon $to): array
    {
        $sales = Sale::with(['cashier:id,name', 'items'])
            ->whereIn('status', [Sale::STATUS_PAID, Sale::STATUS_VOID])
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('paid_at', [$from, $to])
                    ->orWhereBetween('voided_at', [$from, $to]);
            })
            ->orderByDesc('created_at')
            ->get();

        $revenue = Sale::where('status', Sale::STATUS_PAID)->whereBetween('paid_at', [$from, $to])->sum('grand_total');
        $discount = Sale::where('status', Sale::STATUS_PAID)->whereBetween('paid_at', [$from, $to])->sum('discount_amount');
        $productSales = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
            ->whereBetween('sales.paid_at', [$from, $to])->sum('sale_items.subtotal');
        $serviceSales = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)->where('sale_items.item_type', SaleItem::TYPE_SERVICE)
            ->whereBetween('sales.paid_at', [$from, $to])->sum('sale_items.subtotal');
        $voided = Sale::where('status', Sale::STATUS_VOID)->whereBetween('voided_at', [$from, $to])->sum('grand_total');

        $paymentMethod = Sale::where('status', Sale::STATUS_PAID)
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('payment_method, COUNT(*) as count, SUM(grand_total) as total')
            ->groupBy('payment_method')->get();

        return [
            'summary' => [
                'transactions' => Sale::where('status', Sale::STATUS_PAID)->whereBetween('paid_at', [$from, $to])->count(),
                'revenue' => $revenue,
                'discount' => $discount,
                'product_sales' => $productSales,
                'service_sales' => $serviceSales,
                'voided' => $voided,
            ],
            'payment_methods' => $paymentMethod->map(fn($r) => [
                'method' => $r->payment_method,
                'count' => (int) $r->count,
                'total' => (float) $r->total,
            ])->values(),
            'transactions' => $sales->map(function ($s) {
                return [
                    'id' => $s->id,
                    'sale_code' => $s->sale_code,
                    'status' => $s->status,
                    'cashier' => optional($s->cashier)->name,
                    'payment_method' => $s->payment_method,
                    'subtotal' => $s->subtotal,
                    'discount_amount' => $s->discount_amount,
                    'grand_total' => $s->grand_total,
                    'paid_at' => $s->paid_at,
                    'void_reason' => $s->void_reason,
                ];
            })->values(),
        ];
    }

    public function services(Carbon $from, Carbon $to): array
    {
        $orders = ServiceOrder::with(['customer:id,name', 'mechanic:id,name'])
            ->whereBetween('opened_at', [$from, $to])
            ->orderByDesc('opened_at')
            ->get();

        $orderCount = $orders->count();
        $byStatus = $orders->groupBy('status')->map->count();

        $topServices = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_SERVICE)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->selectRaw('sale_items.item_name_snapshot, COUNT(*) as count, SUM(sale_items.subtotal) as total')
            ->groupBy('sale_items.item_name_snapshot')
            ->orderByDesc('count')
            ->limit(10)->get()
            ->map(fn($r) => [
                'service_name' => $r->item_name_snapshot,
                'count' => (int) $r->count,
                'total' => (float) $r->total,
            ])->values();

        $byMechanic = $orders->groupBy(fn($o) => optional($o->mechanic)->name ?? 'Belum ditentukan')
            ->map->count();

        return [
            'summary' => [
                'total_orders' => $orderCount,
                'by_status' => $byStatus,
                'service_revenue' => SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.status', Sale::STATUS_PAID)
                    ->where('sale_items.item_type', SaleItem::TYPE_SERVICE)
                    ->whereBetween('sales.paid_at', [$from, $to])
                    ->sum('sale_items.subtotal'),
            ],
            'top_services' => $topServices,
            'orders' => $orders->map(fn($o) => [
                'id' => $o->id,
                'order_code' => $o->order_code,
                'customer' => optional($o->customer)->name,
                'motorcycle_type' => $o->motorcycle_type,
                'mechanic' => optional($o->mechanic)->name,
                'status' => $o->status,
                'opened_at' => $o->opened_at,
            ])->values(),
            'by_mechanic' => $byMechanic,
        ];
    }

    public function inventory(Carbon $from, Carbon $to): array
    {
        $products = Product::where('is_active', true)->orderBy('name')->get();

        return [
            'summary' => [
                'total_products' => $products->count(),
                'low_stock_count' => $products->filter(fn($p) => $p->isLowStock())->count(),
                'inventory_value' => $products->sum(fn($p) => bcadd('0', bcmul((string) $p->current_stock, (string) $p->purchase_price, 2), 2)),
            ],
            'low_stock' => $products->filter(fn($p) => $p->isLowStock())->values()->map(fn($p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
                'unit' => $p->unit,
            ]),
            'products' => $products->map(fn($p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
                'unit' => $p->unit,
                'sale_price' => $p->sale_price,
            ])->values(),
            'top_sold' => SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.status', Sale::STATUS_PAID)
                ->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
                ->whereBetween('sales.paid_at', [$from, $to])
                ->selectRaw('sale_items.item_name_snapshot, SUM(sale_items.quantity) as qty')
                ->groupBy('sale_items.item_name_snapshot')
                ->orderByDesc('qty')
                ->limit(10)->get()
                ->map(fn($r) => ['name' => $r->item_name_snapshot, 'quantity' => (float) $r->qty])
                ->values(),
        ];
    }

    public function finance(Carbon $from, Carbon $to): array
    {
        $revenue = Sale::where('status', Sale::STATUS_PAID)->whereBetween('paid_at', [$from, $to])->sum('grand_total');
        $cogs = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', Sale::STATUS_PAID)
            ->where('sale_items.item_type', SaleItem::TYPE_PRODUCT)
            ->whereBetween('sales.paid_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(sale_items.purchase_price_snapshot * sale_items.quantity), 0) as cogs')
            ->value('cogs') ?? '0';
        $expenses = Expense::whereBetween(DB::raw('DATE(expense_date)'), [$from->toDateString(), $to->toDateString()])->sum('amount');
        $estimated = bcsub(bcsub((string) $revenue, (string) $cogs, 2), (string) $expenses, 2);

        return [
            'summary' => [
                'revenue' => $revenue,
                'cogs' => $cogs,
                'expenses' => $expenses,
                'estimated_result' => $estimated,
            ],
            'expenses' => Expense::whereBetween(DB::raw('DATE(expense_date)'), [$from->toDateString(), $to->toDateString()])
                ->with('createdBy:id,name')
                ->orderByDesc('expense_date')
                ->get()
                ->map(fn($e) => [
                    'id' => $e->id,
                    'expense_date' => $e->expense_date,
                    'category' => $e->category,
                    'amount' => $e->amount,
                    'description' => $e->description,
                    'created_by' => optional($e->createdBy)->name,
                ])->values(),
        ];
    }
}
