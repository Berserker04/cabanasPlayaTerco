<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\CabinType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CabinTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name'              => 'Cabaña Familiar',
                'slug'              => Str::slug('Cabaña Familiar'),
                'short_description' => 'Espacio ideal para familias con niños.',
                'description'       => 'Cabaña amplia con capacidad para 6 personas, ideal para familias que buscan comodidad y cercanía al mar.',
                'max_guests'        => 6,
                'bedrooms'          => 2,
                'bathrooms'         => 1,
                'base_price'        => 350000,
                'size_sqm'          => 45,
                'is_active'         => true,
                'sort_order'        => 1,
            ],
            [
                'name'              => 'Cabaña Romántica',
                'slug'              => Str::slug('Cabaña Romántica'),
                'short_description' => 'Perfecta para parejas que buscan privacidad.',
                'description'       => 'Cabaña íntima para 2 personas con vista al mar, ideal para escapadas románticas.',
                'max_guests'        => 2,
                'bedrooms'          => 1,
                'bathrooms'         => 1,
                'base_price'        => 250000,
                'size_sqm'          => 25,
                'is_active'         => true,
                'sort_order'        => 2,
            ],
            [
                'name'              => 'Cabaña Aventurera',
                'slug'              => Str::slug('Cabaña Aventurera'),
                'short_description' => 'Para los amantes de la naturaleza y la aventura.',
                'description'       => 'Cabaña con capacidad para 4 personas, rodeada de naturaleza y perfecta para actividades al aire libre.',
                'max_guests'        => 4,
                'bedrooms'          => 1,
                'bathrooms'         => 1,
                'base_price'        => 280000,
                'size_sqm'          => 30,
                'is_active'         => true,
                'sort_order'        => 3,
            ],
            [
                'name'              => 'Suite Terco',
                'slug'              => Str::slug('Suite Terco'),
                'short_description' => 'La experiencia premium de Playa Terco.',
                'description'       => 'Suite de lujo con 2 habitaciones, 2 baños y todas las comodidades para una estadía inolvidable.',
                'max_guests'        => 4,
                'bedrooms'          => 2,
                'bathrooms'         => 2,
                'base_price'        => 500000,
                'size_sqm'          => 60,
                'is_active'         => true,
                'sort_order'        => 4,
            ],
        ];

        $amenityIds = Amenity::pluck('id')->toArray();

        foreach ($types as $type) {
            $cabinType = CabinType::updateOrCreate(['slug' => $type['slug']], $type);

            // Attach 5–10 random amenities
            if (count($amenityIds) > 0 && $cabinType->amenities()->count() === 0) {
                $count = min(rand(5, 10), count($amenityIds));
                $randomIds = collect($amenityIds)->shuffle()->take($count)->toArray();
                $cabinType->amenities()->sync($randomIds);
            }
        }
    }
}
