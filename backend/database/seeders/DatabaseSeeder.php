<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Mechanic;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Service;
use App\Services\Sales\CheckoutSaleService;
use App\Support\CodeGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- Users (Admin + Cashier) ---
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Owner Bengkel',
                'email' => 'admin@bengkel.test',
                'password' => 'admin123',
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ]
        );

        $cashier = User::firstOrCreate(
            ['username' => 'kasir'],
            [
                'name' => 'Kasir Bengkel',
                'email' => 'kasir@bengkel.test',
                'password' => 'kasir123',
                'role' => User::ROLE_CASHIER,
                'is_active' => true,
            ]
        );

        // --- Mechanics ---
        $mechanics = [
            ['name' => 'Budi Santoso', 'phone' => '081234567801', 'is_active' => true],
            ['name' => 'Agus Setiawan', 'phone' => '081234567802', 'is_active' => true],
            ['name' => 'Rudi Hartono', 'phone' => '081234567803', 'is_active' => true],
        ];
        $mechanicIds = [];
        foreach ($mechanics as $m) {
            $mechanicIds[] = Mechanic::firstOrCreate(['name' => $m['name']], $m)->id;
        }

        // --- Customers ---
        $customers = [
            ['name' => 'Andi Wijaya', 'phone' => '081298765432', 'motorcycle_type' => 'Honda Vario 125', 'notes' => null],
            ['name' => 'Bambang Pamungkas', 'phone' => '081322211155', 'motorcycle_type' => 'Yamaha NMAX', 'notes' => 'Pelanggan setia'],
            ['name' => 'Citra Kirana', 'phone' => '085711122233', 'motorcycle_type' => 'Honda Beat', 'notes' => null],
            ['name' => 'Dewi Lestari', 'phone' => '087811155566', 'motorcycle_type' => null, 'notes' => null],
        ];
        foreach ($customers as $c) {
            Customer::firstOrCreate(['name' => $c['name']], $c);
        }

        // --- Products ---
        $products = [
            ['sku' => 'OLI-MPX-1', 'name' => 'Oli Mesin MPX 1L', 'category' => 'Oli', 'brand' => 'Yamaha', 'unit' => 'botol', 'purchase_price' => 45000, 'sale_price' => 55000, 'stock' => 25, 'min' => 5],
            ['sku' => 'OLI-AH-1', 'name' => 'Oli Mesin AH 1L', 'category' => 'Oli', 'brand' => 'AHM', 'unit' => 'botol', 'purchase_price' => 42000, 'sale_price' => 52000, 'stock' => 4, 'min' => 5],
            ['sku' => 'KPS-REM-F', 'name' => 'Kampas Rem Depan', 'category' => 'Rem', 'brand' => 'Nissin', 'unit' => 'set', 'purchase_price' => 35000, 'sale_price' => 45000, 'stock' => 15, 'min' => 3],
            ['sku' => 'KPS-REM-B', 'name' => 'Kampas Rem Belakang', 'category' => 'Rem', 'brand' => 'Nissin', 'unit' => 'set', 'purchase_price' => 30000, 'sale_price' => 40000, 'stock' => 12, 'min' => 3],
            ['sku' => 'BUSI-C7', 'name' => 'Busi NGK C7', 'category' => 'Pengapian', 'brand' => 'NGK', 'unit' => 'pcs', 'purchase_price' => 20000, 'sale_price' => 30000, 'stock' => 30, 'min' => 10],
            ['sku' => 'BUSI-I9', 'name' => 'Busi Iridium I9', 'category' => 'Pengapian', 'brand' => 'NGK', 'unit' => 'pcs', 'purchase_price' => 75000, 'sale_price' => 95000, 'stock' => 8, 'min' => 4],
            ['sku' => 'V-BELT', 'name' => 'V-belt CVT', 'category' => 'Transmisi', 'brand' => 'AHM', 'unit' => 'pcs', 'purchase_price' => 120000, 'sale_price' => 150000, 'stock' => 6, 'min' => 2],
            ['sku' => 'RONSO-S', 'name' => 'Rantai + Gir Set', 'category' => 'Rantai', 'brand' => 'Ronso', 'unit' => 'set', 'purchase_price' => 180000, 'sale_price' => 220000, 'stock' => 3, 'min' => 2],
        ];
        foreach ($products as $p) {
            $product = Product::firstOrCreate(
                ['sku' => $p['sku']],
                [
                    'name' => $p['name'],
                    'category' => $p['category'],
                    'brand' => $p['brand'],
                    'unit' => $p['unit'],
                    'purchase_price' => $p['purchase_price'],
                    'sale_price' => $p['sale_price'],
                    'current_stock' => $p['stock'],
                    'min_stock' => $p['min'],
                    'is_active' => true,
                ]
            );
            // Opening stock movement if none exists.
            if ($product->stockMovements()->where('type', StockMovement::TYPE_OPENING)->doesntExist()) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'type' => StockMovement::TYPE_OPENING,
                    'quantity_change' => $p['stock'],
                    'stock_before' => 0,
                    'stock_after' => $p['stock'],
                    'created_by' => $admin->id,
                    'note' => 'Stok awal',
                    'created_at' => now(),
                ]);
            }
        }

        // --- Services ---
        $services = [
            ['code' => 'SVC-GOLI', 'name' => 'Servis Ganti Oli', 'sale_price' => 20000],
            ['code' => 'SVC-RUTIN', 'name' => 'Servis Rutin Ringan', 'sale_price' => 50000],
            ['code' => 'SVC-BESAR', 'name' => 'Servis Besar', 'sale_price' => 150000],
            ['code' => 'SVC-REMREM', 'name' => 'Servis Rem', 'sale_price' => 40000],
            ['code' => 'SVC-KARBURASI', 'name' => 'Tune Up / Karburasi', 'sale_price' => 75000],
        ];
        foreach ($services as $s) {
            Service::firstOrCreate(['code' => $s['code']], $s);
        }

        // --- Service Orders ---
        $customer = Customer::where('name', 'Andi Wijaya')->first();
        $mechanicId = $mechanicIds[0];
        $openOrder = ServiceOrder::firstOrCreate(
            ['order_code' => CodeGenerator::orderCode()],
            [
                'customer_id' => $customer->id,
                'motorcycle_type' => $customer->motorcycle_type,
                'cashier_id' => $cashier->id,
                'mechanic_id' => $mechanicId,
                'complaint' => 'Suara mesin kasar, perlu servis rutin',
                'diagnosis_note' => null,
                'status' => ServiceOrder::STATUS_IN_PROGRESS,
                'opened_at' => now(),
                'completed_at' => null,
            ]
        );

        // --- A PAID sale (linked to service order) to populate dashboard ---
        $checkout = app(CheckoutSaleService::class);
        $sale = Sale::create([
            'sale_code' => CodeGenerator::saleCode(),
            'cashier_id' => $cashier->id,
            'customer_id' => $customer->id,
            'service_order_id' => $openOrder->id,
            'status' => Sale::STATUS_DRAFT,
            'subtotal' => 0,
            'discount_amount' => 0,
            'grand_total' => 0,
        ]);

        $product = Product::where('sku', 'OLI-MPX-1')->first();
        $serviceGoli = Service::where('code', 'SVC-GOLI')->first();
        $sale->items()->createMany([
            [
                'item_type' => SaleItem::TYPE_PRODUCT,
                'product_id' => $product->id,
                'service_id' => null,
                'item_code_snapshot' => $product->sku,
                'item_name_snapshot' => $product->name,
                'quantity' => 1,
                'unit_price' => 0,
                'subtotal' => 0,
            ],
            [
                'item_type' => SaleItem::TYPE_SERVICE,
                'product_id' => null,
                'service_id' => $serviceGoli->id,
                'item_code_snapshot' => $serviceGoli->code,
                'item_name_snapshot' => $serviceGoli->name,
                'quantity' => 1,
                'unit_price' => 0,
                'subtotal' => 0,
            ],
        ]);

        // Auth as the cashier for the checkout service.
        auth()->setUser($cashier);
        $checkout->checkout($sale, 'CASH', 75000, 0);

        // --- Expenses ---
        Expense::firstOrCreate(
            ['expense_date' => now()->toDateString(), 'category' => 'Operasional', 'amount' => 150000, 'description' => 'Listrik'],
            ['created_by' => $admin->id]
        );
        Expense::firstOrCreate(
            ['expense_date' => now()->subDay()->toDateString(), 'category' => 'Operasional', 'amount' => 100000, 'description' => 'Air & internet'],
            ['created_by' => $admin->id]
        );
        Expense::firstOrCreate(
            ['expense_date' => now()->subDays(2)->toDateString(), 'category' => 'Konsumsi', 'amount' => 75000, 'description' => 'Konsumsi karyawan'],
            ['created_by' => $admin->id]
        );

        $this->command?->info('Seeder selesai. Admin: admin/admin123, Kasir: kasir/kasir123');
    }
}
