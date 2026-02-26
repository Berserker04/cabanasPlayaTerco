<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cabin_id')->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedSmallInteger('guests_count');
            $table->string('status')->default('pending');
            $table->string('source')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_price', 10, 2)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['cabin_id', 'check_in', 'check_out', 'status'], 'idx_reservations_availability');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
