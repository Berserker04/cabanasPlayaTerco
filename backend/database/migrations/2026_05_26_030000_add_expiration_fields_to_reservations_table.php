<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->after('display_color');
            $table->timestamp('confirmed_at')->nullable()->after('expires_at');

            $table->index(['status', 'expires_at'], 'idx_reservations_status_expires');
            $table->index(['check_in', 'check_out', 'status'], 'idx_reservations_dates_status');
        });

        DB::table('reservations')
            ->where('status', 'pending')
            ->whereNull('expires_at')
            ->update(['expires_at' => now()->addHours(48)]);
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('idx_reservations_status_expires');
            $table->dropIndex('idx_reservations_dates_status');
            $table->dropColumn(['expires_at', 'confirmed_at']);
        });
    }
};
