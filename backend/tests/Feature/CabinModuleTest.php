<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\Amenity;
use App\Models\Cabin;
use App\Models\CabinMedia;
use App\Models\CabinType;
use App\Models\LodgingTariff;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CabinModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_cabin_list_returns_active_real_cabins_with_media(): void
    {
        $cabinType = $this->createCabinType();
        $visibleCabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 1',
            'slug'          => 'cabana-1',
            'map_slot'      => 'cabana_1',
            'cover_image'   => 'https://example.test/cover.jpg',
        ]);

        $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana oculta',
            'slug'          => 'cabana-oculta',
            'code'          => 'CAB-HID',
            'map_slot'      => 'cabana_2',
            'is_active'     => false,
        ]);

        CabinMedia::create([
            'cabin_id'      => $visibleCabin->id,
            'cabin_type_id' => $cabinType->id,
            'url'           => 'https://example.test/gallery.jpg',
            'type'          => 'image',
            'sort_order'    => 1,
        ]);

        $this->getJson('/api/v1/cabins')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'cabana-1')
            ->assertJsonPath('data.0.cover_image', 'https://example.test/cover.jpg')
            ->assertJsonPath('data.0.max_guests', 8)
            ->assertJsonPath('data.0.map_slot', 'cabana_1')
            ->assertJsonPath('data.0.media.0.url', 'https://example.test/gallery.jpg');
    }

    public function test_public_cabin_detail_returns_amenities_media_and_map_slot(): void
    {
        $cabinType = $this->createCabinType();
        $amenity = Amenity::create(['name' => 'Vista al mar', 'icon' => 'waves', 'category' => 'Ubicacion']);
        $cabinType->amenities()->attach($amenity);

        $cabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 3',
            'slug'          => 'cabana-3',
            'code'          => 'CAB-03',
            'map_slot'      => 'cabana_3',
        ]);

        CabinMedia::create([
            'cabin_id'      => $cabin->id,
            'cabin_type_id' => $cabinType->id,
            'url'           => 'https://example.test/tour.mp4',
            'alt'           => 'Recorrido por la cabana',
            'type'          => 'video',
            'sort_order'    => 1,
        ]);

        $this->getJson('/api/v1/cabins/cabana-3')
            ->assertOk()
            ->assertJsonPath('data.slug', 'cabana-3')
            ->assertJsonPath('data.map_slot', 'cabana_3')
            ->assertJsonPath('data.amenities.0.name', 'Vista al mar')
            ->assertJsonPath('data.media.0.type', 'video');
    }

    public function test_admin_can_create_real_cabin_and_active_map_slots_are_unique(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $payload = [
            'name'              => 'Cabana 1',
            'short_description' => 'Frente al camino principal.',
            'description'       => 'Cabana real para el catalogo publico.',
            'guest_capacity'    => 4,
            'max_guests'        => 8,
            'beds_count'        => 3,
            'bathrooms_count'   => 1,
            'map_slot'          => 'cabana_1',
            'is_active'         => true,
            'sort_order'        => 1,
        ];

        $this->postJson('/api/v1/admin/cabins', $payload)
            ->assertCreated()
            ->assertJsonPath('data.slug', 'cabana-1')
            ->assertJsonPath('data.min_guests', 1)
            ->assertJsonPath('data.map_slot', 'cabana_1')
            ->assertJsonPath('data.type.slug', 'cabana-playa-terco');

        $this->postJson('/api/v1/admin/cabins', [
            ...$payload,
            'name' => 'Cabana duplicada',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['map_slot']);

        $this->postJson('/api/v1/admin/cabins', [
            ...$payload,
            'name'      => 'Cabana inactiva',
            'is_active' => false,
        ])->assertCreated();
    }

    public function test_admin_can_upload_video_media_for_cabin(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin(['cabin_type_id' => $cabinType->id]);

        $this->post('/api/v1/admin/cabin-media', [
            'cabin_id'   => $cabin->id,
            'file'       => UploadedFile::fake()->create('recorrido.mp4', 2048, 'video/mp4'),
            'type'       => 'video',
            'alt'        => 'Video de la cabana',
            'sort_order' => 2,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.cabin_id', $cabin->id)
            ->assertJsonPath('data.type', 'video')
            ->assertJsonPath('data.sort_order', 2);
    }

    public function test_admin_can_upload_multiple_media_files_for_cabin(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin(['cabin_type_id' => $cabinType->id]);

        $this->post('/api/v1/admin/cabin-media', [
            'cabin_id'   => $cabin->id,
            'files'      => [
                UploadedFile::fake()->create('galeria.jpg', 1024, 'image/jpeg'),
                UploadedFile::fake()->create('recorrido.webm', 2048, 'video/webm'),
            ],
            'alt'        => 'Galeria de la cabana',
            'sort_order' => 5,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.cabin_id', $cabin->id)
            ->assertJsonPath('data.0.type', 'image')
            ->assertJsonPath('data.0.sort_order', 5)
            ->assertJsonPath('data.1.type', 'video')
            ->assertJsonPath('data.1.sort_order', 6);
    }

    public function test_lodging_tariffs_are_global_and_public_only_returns_active_records(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $response = $this->postJson('/api/v1/admin/lodging-tariffs', [
            'title'        => 'Hospedaje por noche',
            'price_cop'    => 180000,
            'unit_label'   => 'por persona / noche',
            'description'  => 'Tarifa general del hotel.',
            'includes'     => ['Hospedaje', 'Zonas comunes'],
            'excludes'     => ['Transporte'],
            'public_notes' => 'Sujeto a temporada.',
            'is_active'    => true,
            'sort_order'   => 1,
        ])->assertCreated();

        LodgingTariff::create([
            'title'      => 'Tarifa interna',
            'price_cop'  => 1,
            'unit_label' => 'interno',
            'is_active'  => false,
        ]);

        $this->getJson('/api/v1/lodging-tariffs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $response->json('data.id'))
            ->assertJsonPath('data.0.includes.0', 'Hospedaje');
    }

    public function test_availability_uses_real_cabin_max_capacity(): void
    {
        $cabinType = $this->createCabinType();
        $small = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana pequena',
            'slug'          => 'cabana-pequena',
            'code'          => 'CAB-SM',
            'map_slot'      => 'cabana_1',
            'max_guests'    => 4,
        ]);
        $large = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana amplia',
            'slug'          => 'cabana-amplia',
            'code'          => 'CAB-LG',
            'map_slot'      => 'cabana_2',
            'max_guests'    => 10,
        ]);

        Reservation::create([
            'cabin_id'      => $large->id,
            'check_in'      => '2030-06-10',
            'check_out'     => '2030-06-12',
            'guests_count'  => 6,
            'status'        => ReservationStatus::Cancelled,
            'total_price'   => 600000,
        ]);

        $this->getJson('/api/v1/availability?check_in=2030-06-10&check_out=2030-06-12&guests=6')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $large->id);

        $this->assertNotEquals($small->id, $large->id);
    }

    public function test_admin_endpoints_require_admin_role(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/cabins')->assertForbidden();
    }

    private function createCabinType(array $overrides = []): CabinType
    {
        return CabinType::create(array_merge([
            'name'              => 'Cabana Playa Terco',
            'slug'              => 'cabana-playa-terco-test-' . Str::random(8),
            'description'       => 'Tipo interno para pruebas.',
            'short_description' => 'Tipo interno.',
            'base_price'        => 0,
            'max_guests'        => 1,
            'bedrooms'          => 0,
            'bathrooms'         => 0,
            'is_active'         => false,
            'sort_order'        => 0,
        ], $overrides));
    }

    private function createCabin(array $overrides = []): Cabin
    {
        $cabinTypeId = $overrides['cabin_type_id'] ?? $this->createCabinType()->id;

        return Cabin::create(array_merge([
            'cabin_type_id'     => $cabinTypeId,
            'name'              => 'Cabana Terco',
            'slug'              => 'cabana-terco-' . Str::random(8),
            'code'              => 'CAB-' . Str::upper(Str::random(6)),
            'status'            => CabinStatus::Available,
            'floor'             => 1,
            'notes'             => null,
            'cover_image'       => 'https://example.test/cabana.jpg',
            'short_description' => 'Descanso frente al mar.',
            'description'       => 'Cabana real para pruebas.',
            'guest_capacity'    => 4,
            'min_guests'        => 1,
            'max_guests'        => 8,
            'beds_count'        => 3,
            'bathrooms_count'   => 1,
            'map_slot'          => 'cabana_1',
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
