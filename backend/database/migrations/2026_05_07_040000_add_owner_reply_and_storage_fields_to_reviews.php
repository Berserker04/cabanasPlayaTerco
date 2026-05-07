<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->text('admin_response')->nullable()->after('body');
            $table->timestamp('responded_at')->nullable()->after('approved_by');
            $table->foreignId('responded_by')->nullable()->after('responded_at')->constrained('users')->nullOnDelete();
            $table->index(['user_id', 'created_at'], 'idx_reviews_owner');
        });

        Schema::table('review_media', function (Blueprint $table) {
            $table->string('path')->nullable()->after('url');
            $table->string('mime_type')->nullable()->after('alt');
            $table->unsignedBigInteger('size_bytes')->nullable()->after('mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('review_media', function (Blueprint $table) {
            $table->dropColumn(['path', 'mime_type', 'size_bytes']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('idx_reviews_owner');
            $table->dropConstrainedForeignId('responded_by');
            $table->dropColumn(['responded_at', 'admin_response']);
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
