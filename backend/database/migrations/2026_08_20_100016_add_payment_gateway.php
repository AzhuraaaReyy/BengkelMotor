<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('status', 20)->default('DRAFT')->change();
            $table->string('payment_method', 20)->nullable()->change();
        });

        Schema::create('payment_charges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->string('method', 20);
            $table->decimal('amount', 15, 2);
            $table->string('status', 20)->default('PENDING');
            $table->string('gateway_transaction_id', 100)->nullable()->unique();
            $table->string('gateway_type', 20)->nullable();
            $table->string('va_number', 50)->nullable();
            $table->text('qr_url')->nullable();
            $table->text('qr_string')->nullable();
            $table->text('deeplink')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->index('sale_id');
            $table->index(['status', 'expires_at']);
        });

        DB::table('sales')->where('payment_method', 'TRANSFER')->update(['payment_method' => 'VA']);
        DB::table('sales')->where('payment_method', 'OTHER')->update(['payment_method' => 'QRIS']);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_charges');

        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['DRAFT', 'PAID', 'VOID'])->default('DRAFT')->change();
            $table->enum('payment_method', ['CASH', 'TRANSFER', 'QRIS', 'OTHER'])->nullable()->change();
        });
    }
};
