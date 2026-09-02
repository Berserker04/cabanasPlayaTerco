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
use Database\Seeders\AmenitySeeder;
use Database\Seeders\CabinSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CabinModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_cabin_seeder_creates_eight_demo_cabins_with_images(): void
    {
        $this->seed([
            AmenitySeeder::class,
            CabinSeeder::class,
        ]);

        $cabins = Cabin::query()
            ->with('media')
            ->where('slug', 'like', 'cabana-%')
            ->orderBy('sort_order')
            ->get();

        $this->assertCount(8, $cabins);

        foreach ($cabins as $index => $cabin) {
            $this->assertSame('cabana_' . ($index + 1), $cabin->map_slot);
            $this->assertTrue($cabin->is_active);
            $this->assertNotEmpty($cabin->cover_image);
            $this->assertGreaterThanOrEqual(2, $cabin->media->count());
            $this->assertTrue($cabin->media->contains('url', $cabin->cover_image));
        }
    }

    public function test_public_amenities_returns_global_catalog_ordered_by_category_and_name(): void
    {
        Amenity::create(['name' => 'Vista al mar', 'icon' => 'waves', 'category' => 'outdoor']);
        Amenity::create(['name' => 'Agua caliente', 'icon' => 'flame', 'category' => 'bathroom']);
        Amenity::create(['name' => 'Hamaca', 'icon' => 'bed', 'category' => 'room']);

        $this->getJson('/api/v1/amenities')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'Agua caliente')
            ->assertJsonPath('data.1.name', 'Vista al mar')
            ->assertJsonPath('data.2.name', 'Hamaca');
    }

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
            ->assertJsonPath('data.0.media.0.url', 'https://example.test/gallery.jpg')
            ->assertJsonMissingPath('data.0.amenities');
    }

    public function test_public_cabin_detail_returns_media_and_map_slot_without_cabin_amenities(): void
    {
        $cabinType = $this->createCabinType();
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
            ->assertJsonPath('data.media.0.type', 'video')
            ->assertJsonMissingPath('data.amenities');
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
            ->assertJsonPath('data.type.slug', 'cabana-playa-terco')
            ->assertJsonMissingPath('data.amenities');

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

    public function test_admin_cabin_requests_reject_amenity_ids(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $amenity = Amenity::create(['name' => 'Agua caliente', 'icon' => 'flame', 'category' => 'bathroom']);
        $cabin = $this->createCabin();

        $payload = [
            'name'              => 'Cabana sin amenidades',
            'short_description' => 'Catalogo global de amenidades.',
            'description'       => 'Las amenidades no se asignan por cabana.',
            'guest_capacity'    => 4,
            'max_guests'        => 8,
            'beds_count'        => 3,
            'bathrooms_count'   => 1,
            'map_slot'          => 'cabana_2',
            'amenity_ids'       => [$amenity->id],
        ];

        $this->postJson('/api/v1/admin/cabins', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amenity_ids']);

        $this->putJson("/api/v1/admin/cabins/{$cabin->id}", [
            'name'        => 'Cabana actualizada',
            'amenity_ids' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amenity_ids']);
    }

    public function test_admin_can_upload_video_media_for_cabin(): void
    {
        Storage::fake('s3');
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

        Storage::disk('s3')->assertExists(CabinMedia::firstOrFail()->path);
    }

    public function test_admin_can_upload_multiple_media_files_for_cabin(): void
    {
        Storage::fake('s3');
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

        $response = $this->getJson('/api/v1/availability?check_in=2030-06-10&check_out=2030-06-12&guests=6')
            ->assertOk()
            ->assertJsonCount(2, 'data.cabins')
            ->assertJsonPath('data.summary.available_count', 2)
            ->assertJsonPath('data.summary.can_host_guests', true);

        $entries = collect($response->json('data.cabins'));

        $this->assertFalse($entries->firstWhere('cabin_id', $small->id)['fits_guests']);
        $this->assertTrue($entries->firstWhere('cabin_id', $large->id)['fits_guests']);

        $this->assertNotEquals($small->id, $large->id);
    }

    public function test_admin_can_create_multi_cabin_quoted_reservation(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $first = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 1',
            'slug'          => 'cabana-1',
            'code'          => 'CAB-01',
            'map_slot'      => 'cabana_1',
        ]);
        $second = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 2',
            'slug'          => 'cabana-2',
            'code'          => 'CAB-02',
            'map_slot'      => 'cabana_2',
        ]);

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'     => [$first->id, $second->id],
            'check_in'      => '2030-07-10',
            'check_out'     => '2030-07-12',
            'guests_count'  => 10,
            'leader_name'   => 'Familia Rivas',
            'display_color' => '#0ea5e9',
            'status'        => ReservationStatus::Pending->value,
            'source'        => 'whatsapp',
        ])
            ->assertCreated()
            ->assertJsonCount(2, 'data.cabins')
            ->assertJsonPath('data.cabin_id', $first->id)
            ->assertJsonPath('data.leader_name', 'Familia Rivas')
            ->assertJsonPath('data.display_color', '#0ea5e9');

        $reservation = Reservation::firstOrFail();
        $this->assertNotNull($reservation->expires_at);

        $this->assertDatabaseHas('reservation_cabin', [
            'reservation_id' => $reservation->id,
            'cabin_id'       => $first->id,
        ]);
        $this->assertDatabaseHas('reservation_cabin', [
            'reservation_id' => $reservation->id,
            'cabin_id'       => $second->id,
        ]);

        $response = $this->getJson('/api/v1/admin/availability?check_in=2030-07-10&check_out=2030-07-12&guests=10')
            ->assertOk();

        $entries = collect($response->json('data.cabins'));

        $this->assertSame('reserved', $entries->firstWhere('cabin_id', $first->id)['state']);
        $this->assertSame('reserved', $entries->firstWhere('cabin_id', $second->id)['state']);
        $this->assertSame('Familia Rivas', $entries->firstWhere('cabin_id', $first->id)['leader_name']);
    }

    public function test_expired_pending_quotes_do_not_block_availability(): void
    {
        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);

        $reservation = Reservation::create([
            'cabin_id'      => $cabin->id,
            'check_in'      => '2030-07-20',
            'check_out'     => '2030-07-22',
            'guests_count'  => 2,
            'status'        => ReservationStatus::Pending,
            'expires_at'    => now()->subHour(),
        ]);
        $reservation->cabins()->sync([$cabin->id]);

        $response = $this->getJson('/api/v1/availability?check_in=2030-07-20&check_out=2030-07-22')
            ->assertOk();

        $entry = collect($response->json('data.cabins'))->firstWhere('cabin_id', $cabin->id);

        $this->assertSame('available', $entry['state']);
        $this->assertTrue($entry['is_available']);
    }

    public function test_confirmed_reservations_block_even_without_quote_expiration(): void
    {
        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);

        $reservation = Reservation::create([
            'cabin_id'      => $cabin->id,
            'check_in'      => '2030-07-24',
            'check_out'     => '2030-07-26',
            'guests_count'  => 2,
            'status'        => ReservationStatus::Confirmed,
        ]);
        $reservation->cabins()->sync([$cabin->id]);

        $response = $this->getJson('/api/v1/availability?check_in=2030-07-24&check_out=2030-07-26')
            ->assertOk();

        $entry = collect($response->json('data.cabins'))->firstWhere('cabin_id', $cabin->id);

        $this->assertSame('reserved', $entry['state']);
        $this->assertFalse($entry['is_available']);
    }

    public function test_admin_cannot_overlap_active_reservations(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $first = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);
        $second = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 2',
            'slug'          => 'cabana-2',
            'code'          => 'CAB-02',
            'map_slot'      => 'cabana_2',
        ]);

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'    => [$first->id],
            'check_in'     => '2030-08-01',
            'check_out'    => '2030-08-05',
            'guests_count' => 4,
            'status'       => ReservationStatus::Pending->value,
        ])->assertCreated();

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'    => [$first->id],
            'check_in'     => '2030-08-03',
            'check_out'    => '2030-08-06',
            'guests_count' => 2,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cabin_ids']);

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'    => [$second->id],
            'check_in'     => '2030-08-03',
            'check_out'    => '2030-08-06',
            'guests_count' => 2,
        ])->assertCreated();

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'    => [$first->id],
            'check_in'     => '2030-08-05',
            'check_out'    => '2030-08-06',
            'guests_count' => 2,
        ])->assertCreated();
    }

    public function test_expiration_command_marks_pending_quotes_expired_and_releases_cabin(): void
    {
        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);

        $reservation = Reservation::create([
            'cabin_id'      => $cabin->id,
            'check_in'      => '2030-08-10',
            'check_out'     => '2030-08-12',
            'guests_count'  => 2,
            'status'        => ReservationStatus::Pending,
            'expires_at'    => now()->subMinute(),
        ]);
        $reservation->cabins()->sync([$cabin->id]);

        $this->artisan('reservations:expire-pending')
            ->expectsOutput('Cotizaciones vencidas: 1')
            ->assertExitCode(0);

        $this->assertSame(ReservationStatus::Expired, $reservation->fresh()->status);

        $response = $this->getJson('/api/v1/availability?check_in=2030-08-10&check_out=2030-08-12')
            ->assertOk();
        $entry = collect($response->json('data.cabins'))->firstWhere('cabin_id', $cabin->id);

        $this->assertSame('available', $entry['state']);
    }

    public function test_cancelled_reservations_do_not_block_public_availability(): void
    {
        $cabinType = $this->createCabinType();
        $cabin = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);

        $reservation = Reservation::create([
            'cabin_id'      => $cabin->id,
            'check_in'      => '2030-09-10',
            'check_out'     => '2030-09-12',
            'guests_count'  => 2,
            'status'        => ReservationStatus::Cancelled,
            'total_price'   => 100000,
        ]);
        $reservation->cabins()->sync([$cabin->id]);

        $response = $this->getJson('/api/v1/availability?check_in=2030-09-10&check_out=2030-09-12')
            ->assertOk();

        $entry = collect($response->json('data.cabins'))->firstWhere('cabin_id', $cabin->id);

        $this->assertSame('available', $entry['state']);
        $this->assertTrue($entry['is_available']);
    }

    public function test_manual_blocks_return_orange_state_and_can_be_global(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $first = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);
        $second = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 2',
            'slug'          => 'cabana-2',
            'code'          => 'CAB-02',
            'map_slot'      => 'cabana_2',
        ]);

        $this->postJson('/api/v1/admin/availability-blocks', [
            'check_in'       => '2030-10-01',
            'check_out'      => '2030-10-03',
            'reason'         => 'Mantenimiento cubierta',
            'applies_to_all' => false,
            'cabin_ids'      => [$first->id],
        ])->assertCreated();

        $response = $this->getJson('/api/v1/availability?check_in=2030-10-01&check_out=2030-10-03')
            ->assertOk();
        $entries = collect($response->json('data.cabins'));

        $this->assertSame('blocked', $entries->firstWhere('cabin_id', $first->id)['state']);
        $this->assertSame('orange', $entries->firstWhere('cabin_id', $first->id)['tone']);
        $this->assertSame('available', $entries->firstWhere('cabin_id', $second->id)['state']);

        $this->postJson('/api/v1/admin/availability-blocks', [
            'check_in'       => '2030-11-01',
            'check_out'      => '2030-11-02',
            'reason'         => 'Evento privado',
            'applies_to_all' => true,
        ])->assertCreated();

        $this->getJson('/api/v1/availability?check_in=2030-11-01&check_out=2030-11-02')
            ->assertOk()
            ->assertJsonPath('data.summary.available_count', 0)
            ->assertJsonPath('data.summary.can_host_guests', false);
    }

    public function test_admin_calendar_returns_daily_counts_and_events_for_month(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabinType = $this->createCabinType();
        $first = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'map_slot'      => 'cabana_1',
        ]);
        $second = $this->createCabin([
            'cabin_type_id' => $cabinType->id,
            'name'          => 'Cabana 2',
            'slug'          => 'cabana-2',
            'code'          => 'CAB-02',
            'map_slot'      => 'cabana_2',
        ]);

        $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids'     => [$first->id],
            'check_in'      => '2030-12-10',
            'check_out'     => '2030-12-12',
            'guests_count'  => 2,
            'leader_name'   => 'Familia Agenda',
            'status'        => ReservationStatus::Confirmed->value,
        ])->assertCreated();

        $this->postJson('/api/v1/admin/availability-blocks', [
            'check_in'       => '2030-12-11',
            'check_out'      => '2030-12-12',
            'reason'         => 'Mantenimiento',
            'applies_to_all' => false,
            'cabin_ids'      => [$second->id],
        ])->assertCreated();

        $response = $this->getJson('/api/v1/admin/availability/calendar?month=2030-12')
            ->assertOk()
            ->assertJsonPath('data.period.mode', 'month')
            ->assertJsonPath('data.summary.events_count', 2);

        $days = collect($response->json('data.days'));

        $this->assertSame(1, $days->firstWhere('date', '2030-12-10')['available']);
        $this->assertSame(0, $days->firstWhere('date', '2030-12-11')['available']);
        $this->assertSame(2, $days->firstWhere('date', '2030-12-12')['available']);

        $events = collect($response->json('data.events'));
        $this->assertTrue($events->contains(fn ($event) => $event['leader_name'] === 'Familia Agenda'));
        $this->assertTrue($events->contains(fn ($event) => $event['type'] === 'block'));
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
