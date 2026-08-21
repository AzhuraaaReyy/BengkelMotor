<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\MechanicController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ServiceOrderController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Prefix: /api/v1
*/

Route::prefix('v1')->group(function () {

    // Public webhook (CSRF-exempt; signature-verified; rate-limited).
    Route::post('payments/webhook/midtrans', [PaymentWebhookController::class, 'handle'])
        ->middleware('throttle:30,1');

    // Public: auth (web middleware group starts the session so Sanctum SPA
    // cookie auth can persist the logged-in user across requests).
    Route::prefix('auth')->middleware('web')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
        Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    });

    // Protected API (web middleware group starts the session so Sanctum SPA
    // cookie auth can resolve the authenticated user from the session).
    // throttle:api protects heavy endpoints (dashboard/report/export) from DoS.
    Route::group(['middleware' => ['web', 'auth:sanctum', 'throttle:api']], function () {

        // Dashboard (Admin only)
        Route::get('dashboard', [DashboardController::class, 'index'])
            ->middleware(['role:ADMIN', 'throttle:heavy']);

        // Sales / POS
        Route::get('sales', [SaleController::class, 'index']);
        Route::post('sales', [SaleController::class, 'store']);
        Route::get('sales/{sale}', [SaleController::class, 'show']);
        Route::put('sales/{sale}', [SaleController::class, 'update']);
        Route::post('sales/{sale}/checkout', [SaleController::class, 'checkout']);
        Route::post('sales/{sale}/void', [SaleController::class, 'void'])->middleware('role:ADMIN');

        // Products
        Route::get('products', [ProductController::class, 'index']);
        // Must be declared before products/{product} (static > dynamic).
        Route::get('products/low-stock', [ProductController::class, 'lowStock']);
        Route::get('products/{product}', [ProductController::class, 'show']);
        Route::get('products/{product}/movements', [ProductController::class, 'movements']);
        Route::post('products', [ProductController::class, 'store'])->middleware('role:ADMIN');
        Route::put('products/{product}', [ProductController::class, 'update'])->middleware('role:ADMIN');
        // Stock management (adjust/restock) is shared — both roles may manage
        // stock quantities; only the product master (create/update + Harga
        // Beli) stays Admin-only (Fase 3).
        Route::post('products/{product}/adjust-stock', [ProductController::class, 'adjustStock']);

        // Services (jasa)
        Route::get('services', [ServiceController::class, 'index']);
        Route::post('services', [ServiceController::class, 'store'])->middleware('role:ADMIN');
        Route::put('services/{service}', [ServiceController::class, 'update'])->middleware('role:ADMIN');

        // Customers
        Route::get('customers', [CustomerController::class, 'index']);
        Route::post('customers', [CustomerController::class, 'store']);
        Route::get('customers/{customer}', [CustomerController::class, 'show']);
        Route::put('customers/{customer}', [CustomerController::class, 'update']);

        // Mechanics
        Route::get('mechanics', [MechanicController::class, 'index']);
        Route::post('mechanics', [MechanicController::class, 'store'])->middleware('role:ADMIN');
        Route::put('mechanics/{mechanic}', [MechanicController::class, 'update'])->middleware('role:ADMIN');

        // Service Orders
        Route::get('service-orders', [ServiceOrderController::class, 'index']);
        Route::post('service-orders', [ServiceOrderController::class, 'store']);
        Route::get('service-orders/{serviceOrder}', [ServiceOrderController::class, 'show']);
        Route::put('service-orders/{serviceOrder}', [ServiceOrderController::class, 'update']);
        Route::delete('service-orders/{serviceOrder}', [ServiceOrderController::class, 'destroy']);

        // Expenses (Admin only)
        Route::get('expenses', [ExpenseController::class, 'index'])->middleware('role:ADMIN');
        Route::post('expenses', [ExpenseController::class, 'store'])->middleware('role:ADMIN');
        Route::put('expenses/{expense}', [ExpenseController::class, 'update'])->middleware('role:ADMIN');

        // Reports (Admin only)
        Route::get('reports/sales', [ReportController::class, 'sales'])->middleware(['role:ADMIN', 'throttle:heavy']);
        Route::get('reports/services', [ReportController::class, 'services'])->middleware(['role:ADMIN', 'throttle:heavy']);
        Route::get('reports/inventory', [ReportController::class, 'inventory'])->middleware(['role:ADMIN', 'throttle:heavy']);
        Route::get('reports/finance', [ReportController::class, 'finance'])->middleware(['role:ADMIN', 'throttle:heavy']);
        Route::post('reports/{type}/export', [ReportController::class, 'export'])
            ->whereIn('type', ['sales', 'services', 'inventory', 'finance'])
            ->middleware(['role:ADMIN', 'throttle:heavy']);

        // Users (Admin only)
        Route::get('users', [UserController::class, 'index'])->middleware('role:ADMIN');
        Route::post('users', [UserController::class, 'store'])->middleware('role:ADMIN');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('role:ADMIN');

        // Audit logs (Admin only)
        Route::get('audit-logs', [AuditController::class, 'index'])->middleware('role:ADMIN');
    });
});
