<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('payments_income', function (Blueprint $table) {
            $table->dropForeign(['guest_group_id']);
            $table->foreignId('guest_group_id')->nullable()->change();
            $table->foreign('guest_group_id')->references('id')->on('guest_groups')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('payments_income', function (Blueprint $table) {
            $table->dropForeign(['guest_group_id']);
            $table->foreignId('guest_group_id')->nullable(false)->change();
            $table->foreign('guest_group_id')->references('id')->on('guest_groups')->cascadeOnDelete();
        });
    }
};
