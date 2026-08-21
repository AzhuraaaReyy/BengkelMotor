<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('sale_code', 40)->unique();
            $table->unsignedBigInteger('cashier_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('vehicle_id')->nullable();
            $table->unsignedBigInteger('service_order_id')->nullable()->unique();
            $table->enum('status', ['DRAFT', 'PAID', 'VOID'])->default('DRAFT');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->enum('payment_method', ['CASH', 'TRANSFER', 'QRIS', 'OTHER'])->nullable();
            $table->decimal('paid_amount', 15, 2)->nullable();
            $table->decimal('change_amount', 15, 2)->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->unsignedBigInteger('voided_by')->nullable();
            $table->string('void_reason', 500)->nullable();
            $table->timestamps();

            $table->foreign('cashier_id')->references('id')->on('users');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->foreign('voided_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['status', 'paid_at']);
            $table->index(['cashier_id', 'paid_at']);
            $table->index('customer_id');
            $table->index('vehicle_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
