<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 40)->unique();
            $table->unsignedBigInteger('customer_id');
            $table->unsignedBigInteger('vehicle_id');
            $table->unsignedBigInteger('cashier_id');
            $table->unsignedBigInteger('mechanic_id')->nullable();
            $table->text('complaint');
            $table->text('diagnosis_note')->nullable();
            $table->integer('odometer')->unsigned()->nullable();
            $table->enum('status', ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'])->default('OPEN');
            $table->dateTime('opened_at');
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers');
            $table->foreign('vehicle_id')->references('id')->on('vehicles');
            $table->foreign('cashier_id')->references('id')->on('users');
            $table->foreign('mechanic_id')->references('id')->on('mechanics')->onDelete('set null');

            $table->index(['status', 'opened_at']);
            $table->index(['vehicle_id', 'opened_at']);
            $table->index(['mechanic_id', 'opened_at']);
            $table->index(['cashier_id', 'opened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
