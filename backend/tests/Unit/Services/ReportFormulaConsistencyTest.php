<?php

namespace Tests\Unit\Services;

use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Reports\DashboardQueryService;
use App\Services\Reports\ReportQueryService;
use App\Services\Sales\CheckoutSaleService;
use App\Services\Sales\VoidSaleService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReportFormulaConsistencyTest extends TestCase
{
    public function test_dashboard_and_finance_report_use_the_same_estimated_result_formula(): void
    {
        $cashier = $this->cashier();
        $admin = $this->admin();

        $this->actingAs($cashier);
        $product = Product::factory()->create(['sale_price' => 30000, 'purchase_price' => 20000, 'current_stock' => 10]);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 2,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', null, 0);

        Expense::factory()->create(['amount' => 10000, 'expense_date' => now()->toDateString(), 'created_by' => $admin->id]);

        // Use the current-month range so kpi()'s month_revenue (always "this
        // month", independent of the $from/$to argument) lines up with the
        // report's period-based revenue for the same range.
        $from = Carbon::now()->startOfMonth();
        $to = Carbon::now()->endOfDay();

        $dashboard = app(DashboardQueryService::class)->kpi($from, $to);
        $finance = app(ReportQueryService::class)->finance($from, $to);

        // revenue 60000, cogs 40000, expense 10000 => estimated result 10000
        $this->assertEquals($dashboard['estimated_result'], $finance['summary']['estimated_result']);
        $this->assertEquals(10000, (float) $dashboard['estimated_result']);
        $this->assertEquals($dashboard['month_revenue'], $finance['summary']['revenue']);
    }

    public function test_voided_sale_is_excluded_from_revenue_but_paid_snapshot_still_counts_toward_period(): void
    {
        $cashier = $this->cashier();
        $admin = $this->admin();
        $this->actingAs($cashier);

        $product = Product::factory()->create(['sale_price' => 10000, 'current_stock' => 5]);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);
        $paid = app(CheckoutSaleService::class)->checkout($sale, 'CASH', null, 0);

        $this->actingAs($admin);
        app(VoidSaleService::class)->void($paid, 'Batal');

        $from = Carbon::now()->startOfMonth();
        $to = Carbon::now()->endOfDay();

        $dashboard = app(DashboardQueryService::class)->kpi($from, $to);
        $this->assertEquals(0, (float) $dashboard['month_revenue']);
        $this->assertEquals(1, $dashboard['void_count_today']);
    }

    public function test_cogs_uses_snapshot_price_not_current_master_price(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier);

        $product = Product::factory()->create(['sale_price' => 30000, 'purchase_price' => 20000, 'current_stock' => 5]);
        $sale = Sale::factory()->for($cashier, 'cashier')->create();
        $sale->items()->create([
            'item_type' => SaleItem::TYPE_PRODUCT,
            'product_id' => $product->id,
            'item_name_snapshot' => $product->name,
            'quantity' => 1,
            'unit_price' => 0,
            'subtotal' => 0,
        ]);
        app(CheckoutSaleService::class)->checkout($sale, 'CASH', null, 0);

        // Master purchase price changes after the sale is PAID.
        $product->update(['purchase_price' => 90000]);

        $from = Carbon::now()->startOfDay();
        $to = Carbon::now()->endOfDay();
        $finance = app(ReportQueryService::class)->finance($from, $to);

        $this->assertEquals(20000, (float) $finance['summary']['cogs']);
    }
}
