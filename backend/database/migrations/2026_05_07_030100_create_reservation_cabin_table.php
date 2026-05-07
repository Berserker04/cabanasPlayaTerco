<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_cabin', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cabin_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['reservation_id', 'cabin_id']);
            $table->index(['cabin_id', 'reservation_id']);
        });

        DB::table('reservations')
            ->whereNotNull('cabin_id')
            ->orderBy('id')
            ->select(['id', 'cabin_id', 'created_at', 'updated_at'])
            ->chunkById(200, function ($reservations): void {
                $rows = [];

                foreach ($reservations as $reservation) {
                    $rows[] = [
                        'reservation_id' => $reservation->id,
                        'cabin_id'       => $reservation->cabin_id,
                        'created_at'     => $reservation->created_at,
                        'updated_at'     => $reservation->updated_at,
                    ];
                }

                if ($rows !== []) {
                    DB::table('reservation_cabin')->insertOrIgnore($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_cabin');
    }
};
