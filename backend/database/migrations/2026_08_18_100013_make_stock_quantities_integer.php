<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Fase 3 — Stok bilangan bulat (Rules.md §9 / PRD §8).
 * Stock-related quantity columns are converted from decimal(12,2) to
 * integer so stock can never silently hold fractional units. Money columns
 * (purchase_price, sale_price, unit_price, subtotal, snapshots) stay decimal.
 *
 * Laravel 10+ modifies columns natively without doctrine/dbal on both MySQL
 * and SQLite (SQLite rebuilds the table), so no driver split is needed here.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('current_stock')->default(0)->change();
            $table->integer('min_stock')->default(0)->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->integer('quantity_change')->change();
            $table->integer('stock_before')->change();
            $table->integer('stock_after')->change();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->integer('quantity')->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('current_stock', 12, 2)->default(0)->change();
            $table->decimal('min_stock', 12, 2)->default(0)->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->decimal('quantity_change', 12, 2)->change();
            $table->decimal('stock_before', 12, 2)->change();
            $table->decimal('stock_after', 12, 2)->change();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('quantity', 12, 2)->change();
        });
    }
};