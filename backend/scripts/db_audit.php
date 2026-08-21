<?php

// Read-only data integrity audit against the real (MySQL) database.
// Run with: php artisan tinker --execute="require 'scripts/db_audit.php';"

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Mechanic;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Service;
use App\Models\ServiceOrder;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

function section(string $title): void
{
    echo "\n=== {$title} ===\n";
}

section('Row counts');
foreach ([
    'users' => User::class,
    'mechanics' => Mechanic::class,
    'customers' => Customer::class,
    'products' => Product::class,
    'services' => Service::class,
    'service_orders' => ServiceOrder::class,
    'sales' => Sale::class,
    'sale_items' => SaleItem::class,
    'stock_movements' => StockMovement::class,
    'expenses' => Expense::class,
    'audit_logs' => AuditLog::class,
] as $label => $model) {
    echo str_pad($label, 20) . $model::count() . "\n";
}

section('Users');
foreach (User::all() as $u) {
    $hashOk = str_starts_with($u->getRawOriginal('password'), '$2y$');
    echo "id={$u->id} username={$u->username} role={$u->role} active=" . ($u->is_active ? 'Y' : 'N')
        . " email={$u->email} password_is_bcrypt=" . ($hashOk ? 'Y' : 'N') . "\n";
}
echo "Hash::check('admin123', admin) = " . (Hash::check('admin123', User::where('username', 'admin')->value('password') ?? '') ? 'MATCH' : 'NO MATCH') . "\n";
echo "Hash::check('kasir123', kasir) = " . (Hash::check('kasir123', User::where('username', 'kasir')->value('password') ?? '') ? 'MATCH' : 'NO MATCH') . "\n";

section('Invariant: role must be ADMIN or CASHIER only');
$badRoles = User::whereNotIn('role', ['ADMIN', 'CASHIER'])->count();
echo "users with invalid role: {$badRoles}\n";

section('Invariant: products.current_stock >= 0');
$negativeStock = Product::where('current_stock', '<', 0)->get(['id', 'sku', 'current_stock']);
echo "products with negative stock: " . $negativeStock->count() . "\n";
foreach ($negativeStock as $p) {
    echo "  id={$p->id} sku={$p->sku} current_stock={$p->current_stock}\n";
}

section('Invariant: stock_movements.stock_after >= 0 and quantity_change <> 0');
$badMovements = StockMovement::where('stock_after', '<', 0)->orWhere('quantity_change', 0)->count();
echo "bad stock movements: {$badMovements}\n";

section('Invariant: current_stock matches sum of its own stock_movements (reconciliation)');
$mismatches = 0;
foreach (Product::all() as $p) {
    $sum = StockMovement::where('product_id', $p->id)->sum('quantity_change');
    if (bccomp((string) $sum, (string) $p->current_stock, 2) !== 0) {
        $mismatches++;
        echo "  MISMATCH product id={$p->id} sku={$p->sku} current_stock={$p->current_stock} sum(movements)={$sum}\n";
    }
}
echo "products reconciled OK: " . (Product::count() - $mismatches) . " / " . Product::count() . "\n";

section('Invariant: sales.status must be DRAFT/PAID/VOID; PAID/VOID have required fields');
$badStatus = Sale::whereNotIn('status', ['DRAFT', 'PAID', 'VOID'])->count();
echo "sales with invalid status: {$badStatus}\n";
$paidMissingFields = Sale::where('status', 'PAID')
    ->where(fn ($q) => $q->whereNull('payment_method')->orWhereNull('paid_at'))
    ->count();
echo "PAID sales missing payment_method/paid_at: {$paidMissingFields}\n";
$voidMissingFields = Sale::where('status', 'VOID')
    ->where(fn ($q) => $q->whereNull('void_reason')->orWhereNull('voided_at')->orWhereNull('voided_by'))
    ->count();
echo "VOID sales missing void_reason/voided_at/voided_by: {$voidMissingFields}\n";

section('Invariant: sale_items exactly one of product_id/service_id set per item_type');
$badItems = SaleItem::where(function ($q) {
    $q->where('item_type', 'PRODUCT')->where(function ($qq) {
        $qq->whereNull('product_id')->orWhereNotNull('service_id');
    });
})->orWhere(function ($q) {
    $q->where('item_type', 'SERVICE')->where(function ($qq) {
        $qq->whereNull('service_id')->orWhereNotNull('product_id');
    });
})->count();
echo "sale_items violating product_id/service_id XOR rule: {$badItems}\n";

section('Invariant: grand_total = subtotal - discount_amount (PAID sales)');
$totalMismatch = 0;
foreach (Sale::where('status', 'PAID')->get() as $s) {
    $expected = bcsub((string) $s->subtotal, (string) $s->discount_amount, 2);
    if (bccomp($expected, (string) $s->grand_total, 2) !== 0) {
        $totalMismatch++;
        echo "  MISMATCH sale id={$s->id} code={$s->sale_code} subtotal={$s->subtotal} discount={$s->discount_amount} grand_total={$s->grand_total} expected={$expected}\n";
    }
}
echo "PAID sales with correct grand_total: " . (Sale::where('status', 'PAID')->count() - $totalMismatch) . " / " . Sale::where('status', 'PAID')->count() . "\n";

section('Invariant: PRODUCT sale_items must have purchase_price_snapshot; SERVICE must not');
$badSnapshot = SaleItem::whereHas('sale', fn ($q) => $q->whereIn('status', ['PAID', 'VOID']))
    ->where(function ($q) {
        $q->where('item_type', 'PRODUCT')->whereNull('purchase_price_snapshot');
    })->orWhere(function ($q) {
        $q->where('item_type', 'SERVICE')->whereNotNull('purchase_price_snapshot');
    })->count();
echo "finalized sale_items with wrong snapshot state: {$badSnapshot}\n";

section('Invariant: no orphaned foreign keys (sale_items -> sales, stock_movements -> products)');
$orphanItems = SaleItem::whereNotIn('sale_id', Sale::pluck('id'))->count();
$orphanMovements = StockMovement::whereNotIn('product_id', Product::pluck('id'))->count();
echo "orphan sale_items: {$orphanItems}\n";
echo "orphan stock_movements: {$orphanMovements}\n";

section('Invariant: expenses.amount > 0');
$badExpense = Expense::where('amount', '<=', 0)->count();
echo "expenses with amount <= 0: {$badExpense}\n";

section('Invariant: audit_logs never contain password/hash-looking strings');
$suspect = 0;
foreach (AuditLog::all() as $log) {
    $blob = json_encode([$log->before_data, $log->after_data]);
    if ($blob && (str_contains($blob, '$2y$') || stripos($blob, '"password"') !== false)) {
        $suspect++;
        echo "  SUSPECT audit_log id={$log->id} action={$log->action}\n";
    }
}
echo "audit_logs with suspicious password-like content: {$suspect}\n";

section('Config sanity');
echo 'APP_ENV=' . config('app.env') . "\n";
echo 'APP_DEBUG=' . (config('app.debug') ? 'true' : 'false') . "\n";
echo 'DB connection=' . config('database.default') . ' database=' . config('database.connections.' . config('database.default') . '.database') . "\n";
echo 'SESSION_DRIVER=' . config('session.driver') . "\n";
echo 'SANCTUM stateful=' . implode(',', config('sanctum.stateful')) . "\n";
echo 'CORS allowed_origins=' . implode(',', config('cors.allowed_origins')) . "\n";

echo "\n=== DONE ===\n";
