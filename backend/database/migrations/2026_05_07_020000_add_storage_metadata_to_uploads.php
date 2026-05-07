<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabins', function (Blueprint $table) {
            $table->string('cover_image_path')->nullable()->after('cover_image');
        });

        Schema::table('cabin_media', function (Blueprint $table) {
            $table->string('path')->nullable()->after('url');
            $table->string('mime_type')->nullable()->after('type');
            $table->unsignedBigInteger('size_bytes')->nullable()->after('mime_type');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->string('path')->nullable()->after('url');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('path');
        });

        Schema::table('cabin_media', function (Blueprint $table) {
            $table->dropColumn(['path', 'mime_type', 'size_bytes']);
        });

        Schema::table('cabins', function (Blueprint $table) {
            $table->dropColumn('cover_image_path');
        });
    }
};
