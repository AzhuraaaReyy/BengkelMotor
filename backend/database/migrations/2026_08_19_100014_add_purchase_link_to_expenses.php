<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Fase 3.3 — Stok delta + integrasi pengeluaran restock (Rules.md §9 / PRD §8).
 * Expenses can now be auto-created from a paid PURCHASE stock movement:
 *   - stock_movement_id: reference to the stock_movements row that produced it
 *     (never recorded twice; corrections go through new stock movements).
 *   - source: null = MANUAL (entered by user), 'STOCK_PURCHASE' = auto from restock.
 *   - item_name/quantity/unit_price/payment_method: structured purchase details.
 * All new columns are nullable so existing manual expenses are unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->unsignedBigInteger('stock_movement_id')->nullable()->after('created_by');
            $table->string('source', 20)->nullable()->after('stock_movement_id');
            $table->string('item_name', 160)->nullable()->after('source');
            $table->integer('quantity')->nullable()->after('item_name');
            $table->decimal('unit_price', 15, 2)->nullable()->after('quantity');
            $table->string('payment_method', 20)->nullable()->after('unit_price');

            $table->foreign('stock_movement_id')
                ->references('id')->on('stock_movements')
                ->onDelete('set null');
            $table->index('stock_movement_id');
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['stock_movement_id']);
            $table->dropIndex(['stock_movement_id']);
            $table->dropIndex(['source']);
            $table->dropColumn([
                'stock_movement_id',
                'source',
                'item_name',
                'quantity',
                'unit_price',
                'payment_method',
            ]);
        });
    }
};
