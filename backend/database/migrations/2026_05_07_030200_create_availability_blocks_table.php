<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability_blocks', function (Blueprint $table) {
            $table->id();
            $table->date('check_in');
            $table->date('check_out');
            $table->string('reason');
            $table->text('notes')->nullable();
            $table->boolean('applies_to_all')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['check_in', 'check_out'], 'idx_availability_blocks_dates');
            $table->index('applies_to_all');
        });

        Schema::create('availability_block_cabin', function (Blueprint $table) {
            $table->id();
            $table->foreignId('availability_block_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cabin_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['availability_block_id', 'cabin_id'], 'uniq_availability_block_cabin');
            $table->index(['cabin_id', 'availability_block_id'], 'idx_availability_block_cabin_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_block_cabin');
        Schema::dropIfExists('availability_blocks');
    }
};
