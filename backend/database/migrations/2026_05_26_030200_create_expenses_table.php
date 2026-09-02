<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('category', 100);
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('pending');
            $table->date('due_date');
            $table->date('paid_at')->nullable();
            $table->string('method', 100)->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'due_date']);
            $table->index(['category', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
