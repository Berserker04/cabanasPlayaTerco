<?php

namespace Database\Seeders;

use App\Enums\CabinStatus;
use App\Models\Amenity;
use App\Models\Cabin;
use App\Models\CabinMedia;
use App\Models\CabinType;
use Illuminate\Database\Seeder;

class CabinSeeder extends Seeder
{
    public function run(): void
    {
        $cabinType = CabinType::updateOrCreate(
            ['slug' => 'cabana-playa-terco'],
            [
                'name'              => 'Cabaña Playa Terco',
                'description'       => 'Tipo base para las cabañas físicas de Playa Terco.',
                'short_description' => 'Cabañas reales de Playa Terco.',
                'base_price'        => 0,
                'max_guests'        => 8,
                'bedrooms'          => 0,
                'bathrooms'         => 0,
                'is_active'         => true,
                'sort_order'        => 0,
            ],
        );

        $amenityIds = Amenity::query()
            ->orderBy('id')
            ->pluck('id')
            ->take(8)
            ->toArray();

        if ($amenityIds !== []) {
            $cabinType->amenities()->syncWithoutDetaching($amenityIds);
        }

        $imagePaths = [
            '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
            '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
            '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg',
            '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
        ];

        $cabins = [
            [
                'name'              => 'Cabaña 1',
                'slug'              => 'cabana-1',
                'code'              => 'CAB-01',
                'floor'             => 1,
                'map_slot'          => 'cabana_1',
                'sort_order'        => 1,
                'guest_capacity'    => 4,
                'max_guests'        => 6,
                'beds_count'        => 3,
                'bathrooms_count'   => 1,
                'short_description' => 'Primer piso, cerca del acceso interno hacia la playa.',
                'description'       => 'Cabaña fresca para familias pequeñas, con salida rápida a los caminos internos, zona verde y playa.',
                'images'            => [$imagePaths[0], $imagePaths[1]],
            ],
            [
                'name'              => 'Cabaña 2',
                'slug'              => 'cabana-2',
                'code'              => 'CAB-02',
                'floor'             => 2,
                'map_slot'          => 'cabana_2',
                'sort_order'        => 2,
                'guest_capacity'    => 4,
                'max_guests'        => 6,
                'beds_count'        => 3,
                'bathrooms_count'   => 1,
                'short_description' => 'Segundo piso con brisa y vista hacia la zona verde.',
                'description'       => 'Una opción cómoda para descansar después de playa, caminatas y tardes tranquilas en Playa Terco.',
                'images'            => [$imagePaths[2], $imagePaths[3]],
            ],
            [
                'name'              => 'Cabaña 3',
                'slug'              => 'cabana-3',
                'code'              => 'CAB-03',
                'floor'             => 1,
                'map_slot'          => 'cabana_3',
                'sort_order'        => 3,
                'guest_capacity'    => 5,
                'max_guests'        => 8,
                'beds_count'        => 4,
                'bathrooms_count'   => 1,
                'short_description' => 'Espacio amplio para grupos que quieren estar cerca del centro del complejo.',
                'description'       => 'Cabaña práctica para grupos medianos, con acceso sencillo al comedor, senderos y puntos de encuentro.',
                'images'            => [$imagePaths[3], $imagePaths[0]],
            ],
            [
                'name'              => 'Cabaña 4',
                'slug'              => 'cabana-4',
                'code'              => 'CAB-04',
                'floor'             => 1,
                'map_slot'          => 'cabana_4',
                'sort_order'        => 4,
                'guest_capacity'    => 5,
                'max_guests'        => 8,
                'beds_count'        => 4,
                'bathrooms_count'   => 1,
                'short_description' => 'Cabaña central para grupos familiares y estadías de varios días.',
                'description'       => 'Pensada para descansar sin prisa, con cercanía a zonas comunes y a la ruta interna hacia el mar.',
                'images'            => [$imagePaths[1], $imagePaths[2]],
            ],
            [
                'name'              => 'Cabaña 5',
                'slug'              => 'cabana-5',
                'code'              => 'CAB-05',
                'floor'             => 1,
                'map_slot'          => 'cabana_5',
                'sort_order'        => 5,
                'guest_capacity'    => 4,
                'max_guests'        => 6,
                'beds_count'        => 3,
                'bathrooms_count'   => 1,
                'short_description' => 'Primer piso, buena para parejas, amigos o familias pequeñas.',
                'description'       => 'Alojamiento sencillo y tranquilo entre vegetación, para parejas, amigos o familias pequeñas.',
                'images'            => [$imagePaths[0], $imagePaths[2]],
            ],
            [
                'name'              => 'Cabaña 6',
                'slug'              => 'cabana-6',
                'code'              => 'CAB-06',
                'floor'             => 2,
                'map_slot'          => 'cabana_6',
                'sort_order'        => 6,
                'guest_capacity'    => 4,
                'max_guests'        => 6,
                'beds_count'        => 3,
                'bathrooms_count'   => 1,
                'short_description' => 'Segundo piso, con ambiente ventilado y ubicación elevada.',
                'description'       => 'Una cabaña cómoda para quienes prefieren altura, brisa y una vista más abierta del entorno.',
                'images'            => [$imagePaths[2], $imagePaths[1]],
            ],
            [
                'name'              => 'Cabaña 7',
                'slug'              => 'cabana-7',
                'code'              => 'CAB-07',
                'floor'             => 1,
                'map_slot'          => 'cabana_7',
                'sort_order'        => 7,
                'guest_capacity'    => 5,
                'max_guests'        => 8,
                'beds_count'        => 4,
                'bathrooms_count'   => 1,
                'short_description' => 'Cabaña hacia el costado verde, cómoda para grupos medianos.',
                'description'       => 'Cabaña hacia el costado verde, con espacio para descansar en familia o con amigos.',
                'images'            => [$imagePaths[3], $imagePaths[1]],
            ],
            [
                'name'              => 'Cabaña 8',
                'slug'              => 'cabana-8',
                'code'              => 'CAB-08',
                'floor'             => 1,
                'map_slot'          => 'cabana_8',
                'sort_order'        => 8,
                'guest_capacity'    => 5,
                'max_guests'        => 8,
                'beds_count'        => 4,
                'bathrooms_count'   => 1,
                'short_description' => 'Cabaña tranquila para grupos que quieren estar cerca de la zona verde.',
                'description'       => 'Una cabaña tranquila para descansar en grupo cerca de la zona verde.',
                'images'            => [$imagePaths[1], $imagePaths[0]],
            ],
        ];

        foreach ($cabins as $cabin) {
            $images = $cabin['images'];
            unset($cabin['images']);

            $createdCabin = Cabin::updateOrCreate(
                ['slug' => $cabin['slug']],
                [
                    ...$cabin,
                    'cabin_type_id'     => $cabinType->id,
                    'status'            => CabinStatus::Available,
                    'min_guests'        => 1,
                    'cover_image'       => $images[0],
                    'cover_image_path'  => null,
                    'is_active'         => true,
                    'notes'             => null,
                ],
            );

            foreach ($images as $index => $url) {
                CabinMedia::updateOrCreate(
                    [
                        'cabin_id' => $createdCabin->id,
                        'url'      => $url,
                    ],
                    [
                        'cabin_type_id' => $cabinType->id,
                        'path'          => null,
                        'alt'           => "{$createdCabin->name} en Cabañas Playa Terco",
                        'type'          => 'image',
                        'mime_type'     => 'image/jpeg',
                        'size_bytes'    => null,
                        'sort_order'    => $index + 1,
                    ],
                );
            }

        }
    }
}
