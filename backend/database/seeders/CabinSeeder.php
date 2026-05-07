<?php

namespace Database\Seeders;

use App\Enums\CabinStatus;
use App\Models\Amenity;
use App\Models\Cabin;
use App\Models\CabinType;
use Illuminate\Database\Seeder;

class CabinSeeder extends Seeder
{
    public function run(): void
    {
        $cabinType = CabinType::firstOrCreate(
            ['slug' => 'cabana-playa-terco'],
            [
                'name'              => 'Cabaña Playa Terco',
                'description'       => 'Tipo interno para las cabañas fisicas de Playa Terco.',
                'short_description' => 'Tipo interno.',
                'base_price'        => 0,
                'max_guests'        => 1,
                'bedrooms'          => 0,
                'bathrooms'         => 0,
                'is_active'         => false,
                'sort_order'        => 0,
            ],
        );

        if ($cabinType->amenities()->count() === 0) {
            $amenityIds = Amenity::pluck('id')->take(8)->toArray();
            $cabinType->amenities()->sync($amenityIds);
        }

        $cabins = [
            ['name' => 'Cabaña 1', 'slug' => 'cabana-1', 'code' => 'CAB-01', 'floor' => 1, 'map_slot' => 'cabana_1', 'sort_order' => 1],
            ['name' => 'Cabaña 2', 'slug' => 'cabana-2', 'code' => 'CAB-02', 'floor' => 2, 'map_slot' => 'cabana_2', 'sort_order' => 2],
            ['name' => 'Cabaña 3', 'slug' => 'cabana-3', 'code' => 'CAB-03', 'floor' => 1, 'map_slot' => 'cabana_3', 'sort_order' => 3],
            ['name' => 'Cabaña 4', 'slug' => 'cabana-4', 'code' => 'CAB-04', 'floor' => 1, 'map_slot' => 'cabana_4', 'sort_order' => 4],
            ['name' => 'Cabaña 5', 'slug' => 'cabana-5', 'code' => 'CAB-05', 'floor' => 1, 'map_slot' => 'cabana_5', 'sort_order' => 5],
            ['name' => 'Cabaña 6', 'slug' => 'cabana-6', 'code' => 'CAB-06', 'floor' => 2, 'map_slot' => 'cabana_6', 'sort_order' => 6],
            ['name' => 'Cabaña 7', 'slug' => 'cabana-7', 'code' => 'CAB-07', 'floor' => 1, 'map_slot' => 'cabana_7', 'sort_order' => 7],
            ['name' => 'Cabaña 8', 'slug' => 'cabana-8', 'code' => 'CAB-08', 'floor' => 1, 'map_slot' => 'cabana_8', 'sort_order' => 8],
        ];

        foreach ($cabins as $cabin) {
            Cabin::updateOrCreate(
                ['slug' => $cabin['slug']],
                [
                    ...$cabin,
                    'cabin_type_id'     => $cabinType->id,
                    'status'            => CabinStatus::Available,
                    'short_description' => 'Cabaña nativa dentro de Cabañas Playa Terco, a pasos de la playa.',
                    'description'       => 'Alojamiento tranquilo entre zona verde, caminos internos y salida cercana a la playa. La reserva se confirma por WhatsApp con atencion directa.',
                    'guest_capacity'    => 4,
                    'min_guests'        => 1,
                    'max_guests'        => 8,
                    'beds_count'        => 3,
                    'bathrooms_count'   => 1,
                    'is_active'         => true,
                    'notes'             => 'Ficha base generada para el modulo de cabañas reales.',
                ],
            );
        }
    }
}
