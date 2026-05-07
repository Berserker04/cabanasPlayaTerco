<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AdminUserSeeder::class,
            AmenitySeeder::class,
            CabinTypeSeeder::class,
            CabinSeeder::class,
            LodgingTariffSeeder::class,
            GallerySeeder::class,
            SettingSeeder::class,
        ]);
    }
}
