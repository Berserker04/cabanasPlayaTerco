<?php

namespace Tests\Feature;

use App\Enums\ReservationStatus;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinMapPoint;
use App\Models\CabinMedia;
use App\Models\Lead;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use App\Services\FileUploadService;
use App\Services\PushNotificationService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CabinLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');
        Mail::fake();
        $this->mock(PushNotificationService::class)->shouldReceive('notifyStaffOfNewLead')->byDefault();
        $this->loginAs('admin');
    }

    public function test_delete_and_restore_keep_identity_media_reservations_leads_blocks_and_map_position(): void
    {
        $cabin = $this->cabin();
        $originalIdentity = $cabin->only(['id', 'code', 'slug', 'map_slot']);
        $cover = $this->post('/api/v1/admin/cabins/'.$cabin->id.'/cover', ['file' => UploadedFile::fake()->image('cover.jpg')], ['Accept' => 'application/json'])->assertOk()->json('data.cover_image_path');
        $media = $this->post('/api/v1/admin/cabin-media', ['cabin_id' => $cabin->id, 'file' => UploadedFile::fake()->image('gallery.png')], ['Accept' => 'application/json'])->assertCreated()->json('data');
        $reservation = $this->reservation($cabin, 10, 13);
        $ongoing = $this->reservation($cabin, -1, 1, 'checked_in');
        $block = AvailabilityBlock::create(['check_in' => now()->addDays(20), 'check_out' => now()->addDays(22), 'reason' => 'Revisión', 'applies_to_all' => false]);
        $block->cabins()->attach($cabin->id);
        $lead = Lead::create(['name' => 'Solicitud previa', 'email' => 'qa@example.test', 'source' => 'website', 'status' => 'new', 'message' => 'Datos guardados', 'cabin_id' => $cabin->id]);

        $this->deleteJson('/api/v1/admin/cabins/'.$cabin->id)->assertOk();
        $this->assertSoftDeleted($cabin);
        $this->assertSame($cabin->id, $reservation->fresh()->cabin->id);
        $this->assertSame($cabin->id, $ongoing->fresh()->cabins->first()->id);
        $this->assertSame($cabin->name, $lead->fresh()->cabin->name);
        $this->assertSame($cabin->id, $block->fresh()->cabins->first()->id);
        Storage::disk('public')->assertExists([$cover, $media['path']]);
        $this->assertDatabaseHas('cabin_media', ['id' => $media['id']]);
        $this->getJson('/api/v1/cabins/'.$cabin->slug)->assertNotFound();
        $this->getJson('/api/v1/admin/cabins')->assertJsonCount(0, 'data')->assertJsonPath('summary.deleted', 1);
        $this->getJson('/api/v1/admin/cabins?trashed=only')->assertJsonPath('data.0.id', $cabin->id);
        $this->postJson('/api/v1/admin/cabins', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('map_slot');
        $this->deleteJson('/api/v1/admin/cabin-map-points/'.$cabin->mapPoint->id)->assertUnprocessable();
        $this->putJson('/api/v1/admin/cabin-media/'.$media['id'], ['alt' => 'Cambio'])->assertNotFound();

        $this->postJson('/api/v1/admin/cabins/'.$cabin->id.'/restore')->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.deleted_at', null);
        $this->assertSame($originalIdentity, $cabin->fresh()->only(array_keys($originalIdentity)));
        $this->getJson('/api/v1/cabins/'.$cabin->slug)->assertNotFound();
        $this->putJson('/api/v1/admin/cabins/'.$cabin->id, ['is_active' => true])->assertOk();
        $this->getJson('/api/v1/cabins/'.$cabin->slug)->assertOk()->assertJsonPath('data.media.0.id', $media['id']);
        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);
    }

    public function test_archived_reservations_are_editable_with_conflict_checks_but_no_new_assignment_is_allowed(): void
    {
        $cabin = $this->cabin();
        $reservation = $this->reservation($cabin, 10, 13);
        $other = $this->reservation($cabin, 15, 18);
        $cabin->delete();
        $this->putJson('/api/v1/admin/reservations/'.$reservation->id, ['leader_name' => 'Titular corregido', 'cabin_ids' => [$cabin->id]])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$reservation->id, ['check_in' => now()->addDays(15)->toDateString(), 'check_out' => now()->addDays(17)->toDateString()])->assertUnprocessable()->assertJsonValidationErrors('cabin_ids');
        $this->putJson('/api/v1/admin/reservations/'.$reservation->id, ['check_in' => now()->addDays(8)->toDateString(), 'check_out' => now()->addDays(10)->toDateString()])->assertOk();
        $planner = '/api/v1/admin/availability/planner?check_in='.now()->addDays(8)->toDateString().'&check_out='.now()->addDays(10)->toDateString();
        $this->getJson($planner)->assertOk()->assertJsonCount(0, 'data.cabins');
        $this->getJson($planner.'&exclude_reservation_id='.$reservation->id)->assertOk()->assertJsonPath('data.cabins.0.cabin_id', $cabin->id)->assertJsonPath('data.cabins.0.available_for_range', true);
        $this->postJson('/api/v1/admin/reservations', ['cabin_ids' => [$cabin->id], 'check_in' => now()->addDays(30)->toDateString(), 'check_out' => now()->addDays(32)->toDateString(), 'guests_count' => 2, 'leader_name' => 'Nueva'])->assertUnprocessable()->assertJsonValidationErrors('cabin_ids.0');
        $second = $this->cabin(['map_slot' => 'cabana_2', 'name' => 'Segunda']);
        $new = $this->reservation($second, 30, 32);
        $this->putJson('/api/v1/admin/reservations/'.$new->id, ['cabin_ids' => [$cabin->id], 'status' => 'cancelled'])->assertUnprocessable();
        $this->deleteJson('/api/v1/admin/reservations/'.$other->id)->assertOk();
    }

    public function test_hidden_cabins_remain_operational_and_internal_notes_never_reach_public_endpoints(): void
    {
        $cabin = $this->cabin(['notes' => 'SECRET STAFF NOTES']);
        CabinMedia::create(['cabin_id' => $cabin->id, 'cabin_type_id' => $cabin->cabin_type_id, 'url' => 'https://example.test/media.jpg', 'path' => 'private/storage-key.jpg', 'type' => 'image']);
        AvailabilityBlock::create(['check_in' => now()->addDays(2), 'check_out' => now()->addDays(3), 'reason' => 'Private reason', 'notes' => 'Private block notes', 'applies_to_all' => true]);
        foreach (['/api/v1/cabins', '/api/v1/cabins/'.$cabin->slug, '/api/v1/cabin-map-points', '/api/v1/availability?check_in='.now()->addDays(2)->toDateString().'&check_out='.now()->addDays(3)->toDateString().'&guests=2'] as $url) {
            $response = $this->getJson($url)->assertOk();
            $this->assertPublicKeys($response->json());
            $this->assertStringNotContainsString('SECRET STAFF', $response->getContent());
            $this->assertStringNotContainsString('private/storage-key', $response->getContent());
            $this->assertStringNotContainsString('Private reason', $response->getContent());
        }
        $this->putJson('/api/v1/admin/cabins/'.$cabin->id, ['is_active' => false])->assertOk();
        $this->getJson('/api/v1/cabins')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/cabin-map-points')->assertJsonCount(0, 'data');
        $this->postJson('/api/v1/admin/reservations', ['cabin_ids' => [$cabin->id], 'check_in' => now()->addDays(10)->toDateString(), 'check_out' => now()->addDays(12)->toDateString(), 'guests_count' => 2, 'leader_name' => 'Gestión interna'])->assertCreated();
    }

    public function test_all_form_fields_can_be_edited_and_optional_values_cleared_without_changing_identity(): void
    {
        $cabin = $this->cabin();
        $this->putJson('/api/v1/admin/cabins/'.$cabin->id, ['name' => 'Nombre actualizado', 'floor' => 0, 'min_guests' => 2, 'guest_capacity' => 5, 'max_guests' => 7, 'beds_count' => 0, 'bathrooms_count' => 2, 'short_description' => 'Resumen', 'description' => 'Descripción', 'notes' => 'Nota', 'sort_order' => 65535, 'status' => 'maintenance', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.code', $cabin->code)->assertJsonPath('data.slug', $cabin->slug)->assertJsonPath('data.min_guests', 2)->assertJsonPath('data.floor', 0);
        $this->putJson('/api/v1/admin/cabins/'.$cabin->id, ['floor' => null, 'short_description' => null, 'description' => null, 'notes' => null])
            ->assertOk()->assertJsonPath('data.floor', null)->assertJsonPath('data.notes', null)->assertJsonPath('data.description', null)->assertJsonPath('data.short_description', null);
        foreach (['name' => '', 'floor' => 65536, 'min_guests' => 0, 'max_guests' => 51, 'guest_capacity' => 1, 'beds_count' => -1, 'bathrooms_count' => 51, 'sort_order' => 65536, 'map_slot' => 'not-a-point', 'slug' => 'Bad slug', 'short_description' => str_repeat('a', 501)] as $field => $value) {
            $this->putJson('/api/v1/admin/cabins/'.$cabin->id, [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
    }

    public function test_seeded_points_keep_coordinates_and_dynamic_points_can_be_created_moved_and_deleted(): void
    {
        $expected = [[25.1, 61.4], [25.1, 53], [51.6, 43.9], [51.6, 31.8], [48.6, 19.4], [48.6, 11], [22.8, 38], [22.8, 27.5]];
        $this->assertSame(8, CabinMapPoint::count());
        foreach ($expected as $index => [$x, $y]) {
            $point = CabinMapPoint::where('key', 'cabana_'.($index + 1))->firstOrFail();
            $this->assertEquals($x, $point->x);
            $this->assertEquals($y, $point->y);
        }
        $payload = ['label' => 'Punto adicional', 'x' => 99.99, 'y' => 0, 'sort_order' => 9];
        $point = $this->postJson('/api/v1/admin/cabin-map-points', $payload)->assertCreated()->json('data');
        $this->putJson('/api/v1/admin/cabin-map-points/'.$point['id'], [...$payload, 'label' => 'Punto movido', 'x' => 20, 'y' => 50])->assertOk()->assertJsonPath('data.key', $point['key'])->assertJsonPath('data.label', 'Punto movido');
        foreach (['x' => -0.01, 'y' => 100.01, 'sort_order' => 65536, 'label' => ''] as $field => $value) {
            $this->postJson('/api/v1/admin/cabin-map-points', [...$payload, $field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->deleteJson('/api/v1/admin/cabin-map-points/'.$point['id'])->assertOk();
        $other = $this->postJson('/api/v1/admin/cabin-map-points', $payload)->assertCreated()->json('data');
        $cabin = $this->cabin(['map_slot' => $other['key']]);
        $this->getJson('/api/v1/cabins/'.$cabin->slug)->assertJsonPath('data.map_point.key', $other['key']);
        $cabin->delete();
        $this->deleteJson('/api/v1/admin/cabin-map-points/'.$other['id'])->assertUnprocessable();
        $this->getJson('/api/v1/admin/cabin-map-points')->assertJsonFragment(['key' => $other['key'], 'cabin_id' => $cabin->id, 'cabin_deleted' => true]);
    }

    public function test_database_uniqueness_reserves_hidden_and_deleted_slots_even_without_request_validation(): void
    {
        $first = $this->cabin(['is_active' => false]);
        $second = $this->cabin(['map_slot' => 'cabana_2', 'name' => 'Otra']);
        $first->delete();
        try {
            DB::table('cabins')->where('id', $second->id)->update(['map_slot' => $first->map_slot]);
            $this->fail('The database must reject duplicate map assignments.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('UNIQUE', $exception->getMessage());
        }
        $this->assertSame('cabana_2', $second->fresh()->map_slot);
    }

    public function test_listing_filters_pagination_and_summary_are_independent(): void
    {
        $this->cabin(['name' => 'Visible']);
        $this->cabin(['map_slot' => 'cabana_2', 'name' => 'Oculta', 'is_active' => false]);
        $this->cabin(['map_slot' => 'cabana_3', 'name' => 'Eliminada'])->delete();
        $this->getJson('/api/v1/admin/cabins?search=Oculta&is_active=false&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 1)->assertJsonPath('summary.total', 2)->assertJsonPath('summary.public', 1)->assertJsonPath('summary.deleted', 1);
        $this->getJson('/api/v1/admin/cabins?trashed=with&per_page=1&page=3')->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 3)->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/cabins?trashed=invalid')->assertUnprocessable();
    }

    public function test_cover_replacement_removal_and_real_format_validation(): void
    {
        $cabin = $this->cabin();
        $url = '/api/v1/admin/cabins/'.$cabin->id.'/cover';
        $old = $this->post($url, ['file' => UploadedFile::fake()->image('old.jpg')], ['Accept' => 'application/json'])->assertOk()->json('data.cover_image_path');
        $new = $this->post($url, ['file' => UploadedFile::fake()->image('new.png')], ['Accept' => 'application/json'])->assertOk()->json('data.cover_image_path');
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($new);
        $temporary = tempnam(sys_get_temp_dir(), 'cabin-invalid-');
        file_put_contents($temporary, 'this is plain text');
        try {
            $this->post($url, ['file' => new UploadedFile($temporary, 'fake.jpg', 'image/jpeg', null, true)], ['Accept' => 'application/json'])->assertUnprocessable();
        } finally {
            unlink($temporary);
        }
        $this->post($url, ['file' => UploadedFile::fake()->image('big.jpg')->size(10241)], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertSame($new, $cabin->fresh()->cover_image_path);
        $this->deleteJson($url)->assertOk()->assertJsonPath('data.cover_image', null)->assertJsonPath('data.cover_image_path', null);
        Storage::disk('public')->assertMissing($new);
    }

    public function test_mixed_gallery_validates_types_limits_and_metadata(): void
    {
        $cabin = $this->cabin();
        $headers = ['Accept' => 'application/json'];
        $response = $this->post('/api/v1/admin/cabin-media', ['cabin_id' => $cabin->id, 'files' => [UploadedFile::fake()->image('image.jpg'), UploadedFile::fake()->create('video.mp4', 20, 'video/mp4')], 'sort_order' => 4], $headers)->assertCreated()->assertJsonCount(2, 'data')->assertJsonPath('data.0.type', 'image')->assertJsonPath('data.1.type', 'video');
        $media = $response->json('data');
        $this->putJson('/api/v1/admin/cabin-media/'.$media[0]['id'], ['type' => 'video'])->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->putJson('/api/v1/admin/cabin-media/'.$media[1]['id'], ['alt' => 'Recorrido', 'sort_order' => 0])->assertOk();
        $this->getJson('/api/v1/cabins/'.$cabin->slug)->assertJsonPath('data.media.0.type', 'video')->assertJsonPath('data.media.0.alt', 'Recorrido');
        $this->putJson('/api/v1/admin/cabin-media/'.$media[1]['id'], ['alt' => null])->assertOk()->assertJsonPath('data.alt', null);
        $this->post('/api/v1/admin/cabin-media', ['cabin_id' => $cabin->id, 'file' => UploadedFile::fake()->image('image.jpg'), 'type' => 'video'], $headers)->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->post('/api/v1/admin/cabin-media', ['cabin_id' => $cabin->id, 'file' => UploadedFile::fake()->create('video.mp4', 153601, 'video/mp4')], $headers)->assertUnprocessable();
        $this->post('/api/v1/admin/cabin-media', ['cabin_id' => $cabin->id, 'files' => array_fill(0, 21, UploadedFile::fake()->image('image.jpg'))], $headers)->assertUnprocessable()->assertJsonValidationErrors('files');
        $this->deleteJson('/api/v1/admin/cabin-media/'.$media[0]['id'])->assertOk();
        Storage::disk('public')->assertMissing($media[0]['path']);
        Storage::disk('public')->assertExists($media[1]['path']);
    }

    public function test_failed_media_batch_rolls_back_only_that_batch_and_retry_keeps_existing_resources(): void
    {
        $cabin = $this->cabin();
        $real = new FileUploadService;
        $existing = $real->upload(UploadedFile::fake()->image('saved.jpg'), 'cabins/media');
        CabinMedia::create(['cabin_id' => $cabin->id, 'cabin_type_id' => $cabin->cabin_type_id, 'url' => $existing['url'], 'path' => $existing['path'], 'type' => 'image']);
        $calls = 0;
        $mock = $this->mock(FileUploadService::class);
        $mock->shouldReceive('upload')->andReturnUsing(function ($file, $directory) use ($real, &$calls) {
            if (++$calls === 2) {
                throw ValidationException::withMessages(['file' => 'Fallo simulado']);
            }

            return $real->upload($file, $directory);
        });
        $mock->shouldReceive('delete')->andReturnUsing(fn ($path) => $real->delete($path));
        $files = ['cabin_id' => $cabin->id, 'files' => [UploadedFile::fake()->image('one.jpg'), UploadedFile::fake()->image('two.jpg')]];
        $this->post('/api/v1/admin/cabin-media', $files, ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertSame(1, $cabin->media()->count());
        $this->assertCount(1, Storage::disk('public')->allFiles());
        Storage::disk('public')->assertExists($existing['path']);
        $this->app->instance(FileUploadService::class, $real);
        $this->post('/api/v1/admin/cabin-media', $files, ['Accept' => 'application/json'])->assertCreated();
        $this->assertSame(3, $cabin->media()->count());
        $this->assertSame(1, Cabin::count());
    }

    public function test_catalogs_clear_optional_values_validate_fields_and_update_publicly(): void
    {
        $this->app->setLocale('es');
        $tariff = $this->postJson('/api/v1/admin/lodging-tariffs', ['title' => 'Tarifa QA', 'price_cop' => 120000, 'unit_label' => 'por noche', 'description' => 'Texto', 'public_notes' => 'Notas', 'includes' => ['Desayuno'], 'excludes' => ['Transporte'], 'is_active' => true])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/lodging-tariffs/'.$tariff, ['description' => null, 'public_notes' => null, 'includes' => [], 'excludes' => []])->assertOk()->assertJsonPath('data.description', null)->assertJsonPath('data.includes', []);
        $this->getJson('/api/v1/lodging-tariffs')->assertJsonPath('data.0.public_notes', null)->assertJsonPath('data.0.excludes', []);
        $this->putJson('/api/v1/admin/lodging-tariffs/'.$tariff, ['title' => '', 'unit_label' => null, 'price_cop' => -1, 'sort_order' => 65536])->assertUnprocessable()->assertJsonValidationErrors(['title', 'unit_label', 'price_cop', 'sort_order'])->assertJsonPath('errors.price_cop.0', 'El campo precio COP debe ser mayor o igual a 0.');
        $amenity = $this->postJson('/api/v1/admin/amenities', ['name' => 'Amenidad QA', 'icon' => 'wifi', 'category' => 'Confort'])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/amenities/'.$amenity, ['icon' => null, 'category' => null])->assertOk()->assertJsonPath('data.category', null);
        $this->getJson('/api/v1/amenities')->assertJsonPath('data.0.icon', null);
        $this->putJson('/api/v1/admin/amenities/'.$amenity, ['name' => '', 'icon' => str_repeat('a', 101)])->assertUnprocessable()->assertJsonValidationErrors(['name', 'icon']);
        $this->deleteJson('/api/v1/admin/lodging-tariffs/'.$tariff)->assertOk();
        $this->deleteJson('/api/v1/admin/amenities/'.$amenity)->assertOk();
        $this->getJson('/api/v1/lodging-tariffs')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/amenities')->assertJsonCount(0, 'data');
    }

    public function test_contact_accepts_fifty_guests_keeps_context_and_survives_notification_failures(): void
    {
        $cabin = $this->cabin(['notes' => 'Internal contact secret']);
        $this->mock(PushNotificationService::class)->shouldReceive('notifyStaffOfNewLead')->once()->andThrow(new \RuntimeException('Simulated push failure'));
        Mail::shouldReceive('to')->once()->andThrow(new \RuntimeException('Simulated mail failure'));
        $payload = ['name' => 'Consulta QA', 'email' => 'qa@example.test', 'message' => 'Consultar fechas para el grupo de prueba.', 'cabin_id' => $cabin->id, 'guests_count' => 50, 'check_in' => now()->addDays(10)->toDateString(), 'check_out' => now()->addDays(12)->toDateString()];
        $response = $this->postJson('/api/v1/contact', $payload)->assertCreated()->assertJsonPath('meta.email_sent', false)->assertJsonPath('data.cabin_id', $cabin->id);
        $this->assertPublicKeys($response->json());
        $this->assertDatabaseHas('leads', ['cabin_id' => $cabin->id, 'guests_count' => 50, 'check_in' => $payload['check_in'].' 00:00:00']);
        $cabin->update(['is_active' => false]);
        $this->postJson('/api/v1/contact', $payload)->assertUnprocessable()->assertJsonValidationErrors('cabin_id');
        $this->assertSame(1, Lead::count());
    }

    public function test_permissions_keep_read_access_and_reject_all_catalog_mutations_for_staff_and_viewers(): void
    {
        $cabin = $this->cabin();
        foreach (['staff', 'viewer'] as $role) {
            $this->loginAs($role);
            $this->getJson('/api/v1/admin/cabins')->assertOk();
            $this->getJson('/api/v1/admin/cabin-map-points')->assertOk();
            $this->postJson('/api/v1/admin/cabins', $this->payload())->assertForbidden();
            $this->deleteJson('/api/v1/admin/cabins/'.$cabin->id)->assertForbidden();
            $this->postJson('/api/v1/admin/cabins/'.$cabin->id.'/restore')->assertForbidden();
            $this->deleteJson('/api/v1/admin/cabins/'.$cabin->id.'/cover')->assertForbidden();
            $this->postJson('/api/v1/admin/cabin-map-points', [])->assertForbidden();
            $this->postJson('/api/v1/admin/lodging-tariffs', [])->assertForbidden();
            $this->postJson('/api/v1/admin/amenities', [])->assertForbidden();
        }
    }

    public function test_existing_blocks_retain_archived_cabins_but_new_blocks_cannot_assign_them(): void
    {
        $cabin = $this->cabin();
        $dates = ['check_in' => now()->addDays(20)->toDateString(), 'check_out' => now()->addDays(22)->toDateString()];
        $payload = [...$dates, 'reason' => 'Revisión QA', 'applies_to_all' => false, 'cabin_ids' => [$cabin->id]];
        $id = $this->postJson('/api/v1/admin/availability-blocks', $payload)->assertCreated()->json('data.id');
        $cabin->delete();
        $this->putJson('/api/v1/admin/availability-blocks/'.$id, ['notes' => 'Conservar vínculo archivado'])->assertOk();
        $this->assertSame([$cabin->id], AvailabilityBlock::findOrFail($id)->cabins->modelKeys());
        $this->putJson('/api/v1/admin/availability-blocks/'.$id, ['check_out' => $dates['check_in']])->assertUnprocessable()->assertJsonValidationErrors('check_out');
        $this->postJson('/api/v1/admin/availability-blocks', $payload)->assertUnprocessable()->assertJsonValidationErrors('cabin_ids.0');
        $secondCabin = $this->cabin(['name' => 'Otra cabaña', 'map_slot' => 'cabana_2']);
        $otherBlock = $this->postJson('/api/v1/admin/availability-blocks', [...$payload, 'cabin_ids' => [$secondCabin->id]])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/availability-blocks/'.$otherBlock, ['cabin_ids' => [$secondCabin->id, $cabin->id]])->assertUnprocessable()->assertJsonValidationErrors('cabin_ids');
    }

    public function test_public_dates_follow_the_property_day_and_guests_are_limited_to_fifty(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-09-09 02:00:00', 'UTC'));
        $dates = ['check_in' => '2026-09-08', 'check_out' => '2026-09-10'];
        $this->getJson('/api/v1/availability?'.http_build_query([...$dates, 'guests' => 50]))->assertOk();
        $this->getJson('/api/v1/availability?'.http_build_query([...$dates, 'guests' => 51]))->assertUnprocessable()->assertJsonValidationErrors('guests');
        $this->getJson('/api/v1/availability?check_in=2026-09-07&check_out=2026-09-10')->assertUnprocessable()->assertJsonValidationErrors('check_in');
        $this->postJson('/api/v1/contact', [...$dates, 'name' => 'Fecha local QA', 'email' => 'local@example.test', 'message' => 'Llegada el día local de la cabaña.', 'guests_count' => 50])->assertCreated();
        $this->travelBack();
    }

    private function loginAs(string $role): void
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => $role]));
        Sanctum::actingAs($user);
    }

    private function payload(array $overrides = []): array
    {
        return [...['name' => 'Cabaña QA', 'guest_capacity' => 4, 'min_guests' => 1, 'max_guests' => 8, 'beds_count' => 3, 'bathrooms_count' => 1, 'map_slot' => 'cabana_1', 'is_active' => true], ...$overrides];
    }

    private function cabin(array $overrides = []): Cabin
    {
        $id = $this->postJson('/api/v1/admin/cabins', $this->payload($overrides))->assertCreated()->json('data.id');

        return Cabin::findOrFail($id);
    }

    private function reservation(Cabin $cabin, int $from, int $to, string $status = 'confirmed'): Reservation
    {
        $reservation = Reservation::create(['cabin_id' => $cabin->id, 'check_in' => now()->addDays($from), 'check_out' => now()->addDays($to), 'guests_count' => 2, 'leader_name' => 'Titular QA', 'status' => $status]);
        $reservation->cabins()->attach($cabin->id);

        return $reservation;
    }

    private function assertPublicKeys(array $data): void
    {
        foreach ($data as $key => $value) {
            $this->assertNotContains($key, ['notes', 'cover_image_path', 'path', 'assigned_to']);
            if (is_array($value)) {
                $this->assertPublicKeys($value);
            }
        }
    }
}
