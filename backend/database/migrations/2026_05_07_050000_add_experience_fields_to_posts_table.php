<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('type')->default('article')->after('user_id');
            $table->text('summary')->nullable()->after('excerpt');
            $table->string('cover_image_path')->nullable()->after('featured_image');
            $table->date('visit_date')->nullable()->after('published_at');
            $table->string('travel_style')->nullable()->after('visit_date');
            $table->unsignedSmallInteger('media_count')->default(0)->after('travel_style');
            $table->index(['type', 'status', 'published_at'], 'idx_posts_type_public');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('idx_posts_type_public');
            $table->dropColumn([
                'type',
                'summary',
                'cover_image_path',
                'visit_date',
                'travel_style',
                'media_count',
            ]);
        });
    }
};
