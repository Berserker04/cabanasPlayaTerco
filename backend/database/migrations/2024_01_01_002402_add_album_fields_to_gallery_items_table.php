<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gallery_items', function (Blueprint $table) {
            $table->foreignId('gallery_album_id')
                ->nullable()
                ->after('id')
                ->constrained('gallery_albums')
                ->nullOnDelete();
            $table->string('path')->nullable()->after('url');
            $table->string('thumbnail_path')->nullable()->after('thumbnail_url');
            $table->string('mime_type')->nullable()->after('type');
            $table->unsignedBigInteger('size_bytes')->nullable()->after('mime_type');
            $table->boolean('is_active')->default(true)->after('is_featured');

            $table->index(['gallery_album_id', 'sort_order']);
            $table->index(['is_active', 'category', 'type']);
        });
    }

    public function down(): void
    {
        Schema::table('gallery_items', function (Blueprint $table) {
            $table->dropIndex('gallery_items_gallery_album_id_sort_order_index');
            $table->dropIndex('gallery_items_is_active_category_type_index');
            $table->dropConstrainedForeignId('gallery_album_id');
            $table->dropColumn([
                'path',
                'thumbnail_path',
                'mime_type',
                'size_bytes',
                'is_active',
            ]);
        });
    }
};
