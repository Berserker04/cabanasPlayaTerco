<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabins', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
            $table->string('cover_image')->nullable()->after('notes');
            $table->string('short_description', 500)->nullable()->after('cover_image');
            $table->text('description')->nullable()->after('short_description');
            $table->unsignedSmallInteger('guest_capacity')->default(2)->after('description');
            $table->unsignedSmallInteger('min_guests')->default(1)->after('guest_capacity');
            $table->unsignedSmallInteger('max_guests')->default(2)->after('min_guests');
            $table->unsignedSmallInteger('beds_count')->default(1)->after('max_guests');
            $table->unsignedSmallInteger('bathrooms_count')->default(1)->after('beds_count');
            $table->string('map_slot')->nullable()->after('bathrooms_count');
            $table->boolean('is_active')->default(true)->after('map_slot');
            $table->unsignedSmallInteger('sort_order')->default(0)->after('is_active');

            $table->index(['is_active', 'status', 'sort_order'], 'idx_cabins_public_listing');
            $table->index('map_slot', 'idx_cabins_map_slot');
        });
    }

    public function down(): void
    {
        Schema::table('cabins', function (Blueprint $table) {
            $table->dropIndex('idx_cabins_public_listing');
            $table->dropIndex('idx_cabins_map_slot');
            $table->dropUnique(['slug']);
            $table->dropColumn([
                'slug',
                'cover_image',
                'short_description',
                'description',
                'guest_capacity',
                'min_guests',
                'max_guests',
                'beds_count',
                'bathrooms_count',
                'map_slot',
                'is_active',
                'sort_order',
            ]);
        });
    }
};
