<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Legacy restock expense linkage. New stock adjustments no longer create
 * expenses automatically; these nullable columns remain for historical
 * STOCK_PURCHASE expense rows and manual expense compatibility.
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
