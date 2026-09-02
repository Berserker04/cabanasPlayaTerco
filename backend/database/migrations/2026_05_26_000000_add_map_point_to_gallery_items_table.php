<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gallery_items', function (Blueprint $table) {
            $table->string('map_point')->nullable()->after('gallery_album_id');
            $table->index(['map_point', 'is_active', 'type'], 'idx_gallery_items_map_point_public');
        });
    }

    public function down(): void
    {
        Schema::table('gallery_items', function (Blueprint $table) {
            $table->dropIndex('idx_gallery_items_map_point_public');
            $table->dropColumn('map_point');
        });
    }
};
