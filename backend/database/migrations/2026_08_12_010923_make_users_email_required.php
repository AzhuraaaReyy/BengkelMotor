<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Login now authenticates by email, so every account needs one.
        // Backfill any legacy NULL email before enforcing NOT NULL below.
        DB::table('users')->whereNull('email')->orderBy('id')->each(function ($user) {
            DB::table('users')->where('id', $user->id)->update([
                'email' => $user->username . '+' . $user->id . '@bengkel.local',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 190)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 190)->nullable()->change();
        });
    }
};
