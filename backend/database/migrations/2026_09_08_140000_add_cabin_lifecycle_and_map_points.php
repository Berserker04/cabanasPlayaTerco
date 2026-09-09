<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stop before changing any schema when legacy assignments need review.
        if (DB::table('cabins')->whereNotNull('map_slot')->groupBy('map_slot')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Hay cabañas que comparten un punto del mapa. Asigna puntos distintos antes de migrar; no se modificó ninguna cabaña.');
        }

        Schema::create('cabin_map_points', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->string('label', 100);
            $table->decimal('x', 7, 4);
            $table->decimal('y', 7, 4);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $positions = [[25.1, 61.4], [25.1, 53], [51.6, 43.9], [51.6, 31.8], [48.6, 19.4], [48.6, 11], [22.8, 38], [22.8, 27.5]];
        foreach ($positions as $index => [$x, $y]) {
            DB::table('cabin_map_points')->insert([
                'key' => 'cabana_'.($index + 1), 'label' => 'Cabaña '.($index + 1),
                'x' => $x, 'y' => $y, 'sort_order' => $index + 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        Schema::table('cabins', function (Blueprint $table): void {
            $table->softDeletes();
            $table->unique('map_slot', 'cabins_map_slot_reserved_unique');
            $table->foreign('map_slot')->references('key')->on('cabin_map_points')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cabins', function (Blueprint $table): void {
            $table->dropForeign(['map_slot']);
            $table->dropUnique('cabins_map_slot_reserved_unique');
            $table->dropSoftDeletes();
        });
        Schema::dropIfExists('cabin_map_points');
    }
};
