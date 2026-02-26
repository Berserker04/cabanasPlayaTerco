<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    public function run(): void
    {
        $amenities = [
            // Room
            ['name' => 'WiFi',              'icon' => 'wifi',        'category' => 'room'],
            ['name' => 'Aire Acondicionado', 'icon' => 'wind',        'category' => 'room'],
            ['name' => 'Ventilador',         'icon' => 'fan',         'category' => 'room'],
            ['name' => 'TV',                 'icon' => 'tv',          'category' => 'room'],
            ['name' => 'Terraza',            'icon' => 'mountain',    'category' => 'room'],
            ['name' => 'Hamaca',             'icon' => 'bed',         'category' => 'room'],
            ['name' => 'Mosquitero',         'icon' => 'shield',      'category' => 'room'],

            // Bathroom
            ['name' => 'Baño Privado',       'icon' => 'bath',        'category' => 'bathroom'],
            ['name' => 'Agua Caliente',      'icon' => 'flame',       'category' => 'bathroom'],
            ['name' => 'Toallas',            'icon' => 'towel',       'category' => 'bathroom'],

            // Kitchen
            ['name' => 'Cocina Equipada',    'icon' => 'utensils',    'category' => 'kitchen'],
            ['name' => 'Nevera',             'icon' => 'refrigerator', 'category' => 'kitchen'],
            ['name' => 'Estufa',             'icon' => 'cooking-pot', 'category' => 'kitchen'],
            ['name' => 'Utensilios',         'icon' => 'utensils',    'category' => 'kitchen'],

            // Outdoor
            ['name' => 'Parrilla (BBQ)',             'icon' => 'beef',       'category' => 'outdoor'],
            ['name' => 'Zona de Fogata',             'icon' => 'campfire',   'category' => 'outdoor'],
            ['name' => 'Vista al Mar',               'icon' => 'waves',      'category' => 'outdoor'],
            ['name' => 'Acceso Directo a la Playa',  'icon' => 'footprints', 'category' => 'outdoor'],
        ];

        foreach ($amenities as $amenity) {
            Amenity::updateOrCreate(['name' => $amenity['name']], $amenity);
        }
    }
}
