<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->enum('type', ['OPENING', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'VOID_RETURN']);
            $table->decimal('quantity_change', 12, 2);
            $table->decimal('stock_before', 12, 2);
            $table->decimal('stock_after', 12, 2);
            $table->unsignedBigInteger('sale_id')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->string('note', 500)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['product_id', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index('sale_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
