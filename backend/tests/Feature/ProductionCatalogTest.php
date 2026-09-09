<?php

namespace Tests\Feature;

use Database\Seeders\AdminUserSeeder;
use Database\Seeders\ProductionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_catalog_has_no_demo_accounts_or_reservations(): void
    {
        $this->seed(ProductionCatalogSeeder::class);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('reservations', 0);
        $this->assertGreaterThan(0, DB::table('cabins')->count());
        $this->assertGreaterThan(0, DB::table('lodging_tariffs')->count());
        $this->assertGreaterThan(0, DB::table('gallery_items')->count());

        $this->expectException(\RuntimeException::class);
        $this->seed(ProductionCatalogSeeder::class);
    }

    public function test_demo_admin_cannot_be_seeded_in_production(): void
    {
        $this->app->instance('env', 'production');

        $this->expectException(\RuntimeException::class);
        (new AdminUserSeeder)->run();
    }
}
