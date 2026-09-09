<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductionCatalogSeeder extends Seeder
{
    public function run(): void
    {
        // Run once on an empty installation. Never overwrite the live catalog.
        foreach (['cabins', 'lodging_tariffs', 'gallery_albums', 'users', 'reservations'] as $table) {
            if (DB::table($table)->exists()) {
                throw new \RuntimeException('Production catalog initialization requires an empty database.');
            }
        }

        DB::transaction(function (): void {
            $this->call([
                RoleSeeder::class,
                AmenitySeeder::class,
                CabinTypeSeeder::class,
                CabinSeeder::class,
                LodgingTariffSeeder::class,
                GallerySeeder::class,
                SettingSeeder::class,
            ]);
        });
    }
}
