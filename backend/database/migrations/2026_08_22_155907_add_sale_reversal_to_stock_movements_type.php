<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('OPENING', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'VOID_RETURN', 'SALE_REVERSAL') NOT NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE stock_movements MODIFY COLUMN type ENUM('OPENING', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'VOID_RETURN') NOT NULL");
    }
};
