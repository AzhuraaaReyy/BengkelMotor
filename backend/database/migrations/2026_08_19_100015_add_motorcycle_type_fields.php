<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Motor type is recorded in two layers (Design.md §6):
        // 1. customers.motorcycle_type — the customer's default/last bike
        //    (auto-filled in the order form when the phone matches).
        // 2. service_orders.motorcycle_type — the bike brought in for THIS
        //    order, pre-filled from the customer but editable per order, so a
        //    customer with more than one bike is handled without touching the
        //    customer master record.
        Schema::table('customers', function (Blueprint $table) {
            $table->string('motorcycle_type', 100)->nullable()->after('phone');
        });

        Schema::table('service_orders', function (Blueprint $table) {
            $table->string('motorcycle_type', 100)->nullable()->after('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('motorcycle_type');
        });

        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropColumn('motorcycle_type');
        });
    }
};