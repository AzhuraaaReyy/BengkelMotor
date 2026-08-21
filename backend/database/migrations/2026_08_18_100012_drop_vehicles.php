<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            // SQLite (used by the test suite) only supports dropping a column
            // via native "alter table ... drop column", and that fails while
            // the column is still part of an index or foreign key. So the
            // drop must be split into separate steps: drop the index, then
            // drop the FK (Laravel rebuilds the table to remove it), and only
            // then drop the column. (dropForeign by name throws on SQLite.)
            Schema::table('sales', function (Blueprint $table) {
                $table->dropIndex(['vehicle_id']);
            });
            Schema::table('service_orders', function (Blueprint $table) {
                $table->dropIndex(['vehicle_id', 'opened_at']);
            });

            Schema::table('sales', function (Blueprint $table) {
                $table->dropForeign(['vehicle_id']);
            });
            Schema::table('service_orders', function (Blueprint $table) {
                $table->dropForeign(['vehicle_id']);
            });

            Schema::table('sales', function (Blueprint $table) {
                $table->dropColumn('vehicle_id');
            });
            Schema::table('service_orders', function (Blueprint $table) {
                $table->dropColumn(['vehicle_id', 'odometer']);
            });
        } else {
            Schema::table('sales', function (Blueprint $table) {
                $table->dropForeign('sales_vehicle_id_foreign');
                $table->dropIndex('sales_vehicle_id_index');
                $table->dropColumn('vehicle_id');
            });

            Schema::table('service_orders', function (Blueprint $table) {
                $table->dropForeign('service_orders_vehicle_id_foreign');
                $table->dropIndex('service_orders_vehicle_id_opened_at_index');
                $table->dropColumn(['vehicle_id', 'odometer']);
            });
        }

        Schema::dropIfExists('vehicles');
    }

    public function down(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('plate_number', 20)->unique();
            $table->string('brand', 80);
            $table->string('model', 100);
            $table->smallInteger('year')->unsigned()->nullable();
            $table->integer('last_odometer')->unsigned()->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
        });

        Schema::table('service_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id');
            $table->integer('odometer')->unsigned()->nullable();
            $table->foreign('vehicle_id')->references('id')->on('vehicles');
            $table->index(['vehicle_id', 'opened_at']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id')->nullable();
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->index('vehicle_id');
        });
    }
};