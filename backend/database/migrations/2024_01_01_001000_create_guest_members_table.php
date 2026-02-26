<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_group_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('document_number')->nullable();
            $table->string('document_type')->nullable();
            $table->unsignedSmallInteger('age')->nullable();
            $table->boolean('is_minor')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_members');
    }
};
