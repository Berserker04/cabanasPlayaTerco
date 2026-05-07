<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\Amenity;
use App\Models\Cabin;
use App\Models\CabinMedia;
use App\Models\CabinType;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CabinModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_cabin_list_only_returns_active_types_with_counts(): void
    {
        $active = $this->createCabinType(['name' => 'Cabana Familiar', 'slug' => 'cabana-familiar']);
        $inactive = $this->createCabinType(['name' => 'Cabana Oculta', 'slug' => 'cabana-oculta', 'is_active' => false]);

        Cabin::create([
            'cabin_type_id' => $active->id,
            'name'          => 'Familiar 1',
            'code'          => 'FAM-1',
            'status'        => CabinStatus::Available,
        ]);

        Cabin::create([
            'cabin_type_id' => $active->id,
            'name'          => 'Familiar 2',
            'code'          => 'FAM-2',
            'status'        => CabinStatus::Maintenance,
        ]);

        Cabin::create([
            'cabin_type_id' => $inactive->id,
            'name'          => 'Oculta 1',
            'code'          => 'OCC-1',
            'status'        => CabinStatus::Available,
        ]);

        $this->getJson('/api/v1/cabins')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'cabana-familiar')
            ->assertJsonPath('data.0.cabins_count', 2)
            ->assertJsonPath('data.0.available_cabins_count', 1);
    }

    public function test_public_cabin_detail_returns_media_and_amenities(): void
    {
        $cabinType = $this->createCabinType(['slug' => 'suite-terco']);
        $amenity = Amenity::create(['name' => 'Vista al mar', 'icon' => 'waves', 'category' => 'Ubicacion']);
        $cabinType->amenities()->attach($amenity);

        CabinMedia::create([
            'cabin_type_id' => $cabinType->id,
            'url'           => 'https://example.test/cabana.jpg',
            'alt'           => 'Cabana frente al mar',
            'type'          => 'image',
            'sort_order'    => 1,
        ]);

        $this->getJson('/api/v1/cabins/suite-terco')
            ->assertOk()
            ->assertJsonPath('data.slug', 'suite-terco')
            ->assertJsonPath('data.amenities.0.name', 'Vista al mar')
            ->assertJsonPath('data.media.0.url', 'https://example.test/cabana.jpg');
    }

    public function test_admin_can_manage_cabin_types_units_amenities_and_media(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $amenityResponse = $this->postJson('/api/v1/admin/amenities', [
            'name'     => 'Cocina equipada',
            'icon'     => 'utensils',
            'category' => 'Comodidades',
        ])->assertCreated();

        $amenityId = $amenityResponse->json('data.id');

        $typeResponse = $this->postJson('/api/v1/admin/cabin-types', [
            'name'              => 'Cabana Familiar',
            'slug'              => 'cabana-familiar',
            'description'       => 'Cabana amplia para familias.',
            'short_description' => 'Para familias.',
            'base_price'        => 350000,
            'max_guests'        => 6,
            'bedrooms'          => 2,
            'bathrooms'         => 1,
            'size_sqm'          => 45,
            'is_active'         => true,
            'sort_order'        => 1,
            'amenity_ids'       => [$amenityId],
        ])->assertCreated();

        $cabinTypeId = $typeResponse->json('data.id');

        $this->postJson('/api/v1/admin/cabins', [
            'cabin_type_id' => $cabinTypeId,
            'name'          => 'Familiar 1',
            'code'          => 'FAM-1',
            'status'        => 'available',
            'floor'         => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'FAM-1');

        $media = CabinMedia::create([
            'cabin_type_id' => $cabinTypeId,
            'url'           => 'https://example.test/original.jpg',
            'type'          => 'image',
            'sort_order'    => 0,
        ]);

        $this->putJson("/api/v1/admin/cabin-media/{$media->id}", [
            'alt'        => 'Nueva descripcion',
            'type'       => 'image',
            'sort_order' => 3,
        ])
            ->assertOk()
            ->assertJsonPath('data.alt', 'Nueva descripcion')
            ->assertJsonPath('data.sort_order', 3);

        $this->putJson("/api/v1/admin/amenities/{$amenityId}", [
            'name'     => 'Cocina completa',
            'icon'     => 'utensils',
            'category' => 'Comodidades',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Cocina completa');
    }

    public function test_availability_calendar_does_not_block_checkout_day(): void
    {
        $cabinType = $this->createCabinType();
        $cabin = Cabin::create([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Suite 1',
            'code'          => 'SUI-1',
            'status'        => CabinStatus::Available,
        ]);

        Reservation::create([
            'cabin_id'      => $cabin->id,
            'check_in'      => '2026-06-10',
            'check_out'     => '2026-06-12',
            'guests_count'  => 2,
            'status'        => ReservationStatus::Confirmed,
            'total_price'   => 600000,
        ]);

        $this->getJson("/api/v1/availability/calendar?month=2026-06&cabin_type_id={$cabinType->id}")
            ->assertOk()
            ->assertJsonPath('data.9.available', 0)
            ->assertJsonPath('data.10.available', 0)
            ->assertJsonPath('data.11.available', 1);
    }

    public function test_admin_endpoints_require_admin_role(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/cabin-types')->assertForbidden();
    }

    private function createCabinType(array $overrides = []): CabinType
    {
        return CabinType::create(array_merge([
            'name'              => 'Cabana Terco',
            'slug'              => 'cabana-terco',
            'description'       => 'Cabana frente al mar.',
            'short_description' => 'Descanso frente al mar.',
            'base_price'        => 320000,
            'max_guests'        => 4,
            'bedrooms'          => 1,
            'bathrooms'         => 1,
            'size_sqm'          => 35,
            'is_active'         => true,
            'sort_order'        => 1,
        ], $overrides));
    }

    private function createAdmin(): User
    {
        $user = User::factory()->create();
        $role = Role::create([
            'name'         => 'admin',
            'display_name' => 'Administrador',
        ]);

        $user->roles()->attach($role);

        return $user;
    }
}
