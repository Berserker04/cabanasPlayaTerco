<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabin_media', function (Blueprint $table) {
            $table->foreignId('cabin_id')
                ->nullable()
                ->after('id')
                ->constrained('cabins')
                ->cascadeOnDelete();

            $table->index(['cabin_id', 'sort_order'], 'idx_cabin_media_cabin_order');
        });
    }

    public function down(): void
    {
        Schema::table('cabin_media', function (Blueprint $table) {
            $table->dropIndex('idx_cabin_media_cabin_order');
            $table->dropConstrainedForeignId('cabin_id');
        });
    }
};
