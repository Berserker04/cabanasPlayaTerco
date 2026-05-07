<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lodging_tariffs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->decimal('price_cop', 12, 2);
            $table->string('unit_label')->default('por noche');
            $table->text('description')->nullable();
            $table->json('includes')->nullable();
            $table->json('excludes')->nullable();
            $table->text('public_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order'], 'idx_lodging_tariffs_public');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lodging_tariffs');
    }
};
