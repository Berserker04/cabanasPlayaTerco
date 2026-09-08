<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AvailabilityPlannerEditingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2030-09-08 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_exclusion_is_validated_and_remains_staff_only(): void
    {
        $url = '/api/v1/admin/availability/planner?check_in=2030-09-10&check_out=2030-09-12&exclude_reservation_id=999';
        $this->getJson($url)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson($url)->assertForbidden();
        $this->signInAdmin();
        $this->getJson($url)->assertUnprocessable()->assertJsonValidationErrors('exclude_reservation_id');
    }

    public function test_editing_excludes_only_the_own_reservation_and_keeps_other_occupancy(): void
    {
        $this->signInAdmin();
        $cabin = $this->cabin();
        $own = $this->reservation($cabin);
        $other = $this->reservation($cabin, ['check_in' => '2030-09-12', 'check_out' => '2030-09-14']);
        $url = '/api/v1/admin/availability/planner?check_in=2030-09-10&check_out=2030-09-12';
        $this->getJson($url)->assertOk()->assertJsonPath('data.cabins.0.available_for_range', false);
        $this->getJson($url.'&exclude_reservation_id='.$own->id)
            ->assertOk()->assertJsonPath('data.cabins.0.available_for_range', true);
        $response = $this->getJson('/api/v1/admin/availability/planner?check_in=2030-09-10&check_out=2030-09-14&exclude_reservation_id='.$own->id)
            ->assertOk()->assertJsonPath('data.cabins.0.available_for_range', false);
        $this->assertSame($other->id, collect($response->json('data.cabins.0.segments'))->firstWhere('state', 'reserved')['reservation']['id']);
        $this->putJson('/api/v1/admin/reservations/'.$own->id, ['leader_name' => 'Titular editado'])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$own->id, ['check_out' => '2030-09-13'])
            ->assertUnprocessable()->assertJsonValidationErrors('cabin_ids');
    }

    public function test_quote_exclusion_keeps_other_quotes_and_never_removes_blocks(): void
    {
        $this->signInAdmin();
        $cabin = $this->cabin();
        $own = $this->reservation($cabin, ['status' => ReservationStatus::Pending, 'expires_at' => now()->addDays(2)]);
        $other = $this->reservation($cabin, ['status' => ReservationStatus::Pending, 'expires_at' => now()->addDays(3)]);
        $url = '/api/v1/admin/availability/planner?check_in=2030-09-10&check_out=2030-09-12&exclude_reservation_id='.$own->id;
        $this->getJson($url)->assertOk()->assertJsonPath('data.cabins.0.available_for_range', true)
            ->assertJsonCount(1, 'data.cabins.0.segments.0.quotes')->assertJsonPath('data.cabins.0.segments.0.quotes.0.id', $other->id);
        $block = AvailabilityBlock::create(['check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'reason' => 'Mantenimiento', 'applies_to_all' => true]);
        $this->getJson($url)->assertOk()->assertJsonPath('data.cabins.0.available_for_range', false)
            ->assertJsonPath('data.cabins.0.segments.0.block.id', $block->id);
    }

    public function test_rechecking_shortened_dates_and_server_conflicts_preserves_inventory(): void
    {
        $this->signInAdmin();
        $cabin = $this->cabin();
        $this->reservation($cabin);
        $this->getJson('/api/v1/admin/availability/planner?check_in=2030-09-08&check_out=2030-09-12')
            ->assertOk()->assertJsonPath('data.cabins.0.available_for_range', false);
        $this->getJson('/api/v1/admin/availability/planner?check_in=2030-09-08&check_out=2030-09-09')
            ->assertOk()->assertJsonPath('data.cabins.0.available_for_range', true);
        $this->postJson('/api/v1/admin/reservations', ['cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'guests_count' => 2, 'leader_name' => 'Conflicto', 'status' => 'confirmed'])
            ->assertUnprocessable()->assertJsonValidationErrors('cabin_ids');
        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_existing_record_and_block_actions_complete_the_operating_cycle(): void
    {
        $this->signInAdmin();
        $cabin = $this->cabin();
        $payload = ['cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'guests_count' => 2, 'leader_name' => 'Grupo de prueba', 'status' => 'pending', 'expires_at' => now()->addDays(1)->toISOString()];
        $id = $this->postJson('/api/v1/admin/reservations', $payload)->assertCreated()->json('data.id');
        $second = $this->postJson('/api/v1/admin/reservations', $payload)->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/reservations/'.$id, ['expires_at' => now()->addDays(2)->toISOString()])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$id, ['status' => 'confirmed'])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$second, ['status' => 'confirmed'])->assertUnprocessable();
        $this->putJson('/api/v1/admin/reservations/'.$second, ['notes' => 'Seguimiento de cotización'])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$id, ['status' => 'cancelled'])->assertOk();
        $block = $this->postJson('/api/v1/admin/availability-blocks', ['cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'reason' => 'Prueba de mantenimiento', 'applies_to_all' => false])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/availability-blocks/'.$block, ['reason' => 'Mantenimiento editado'])->assertOk();
        $this->getJson('/api/v1/admin/availability-blocks/'.$block)->assertOk();
        $this->deleteJson('/api/v1/admin/availability-blocks/'.$block)->assertOk();
        $this->assertSoftDeleted('availability_blocks', ['id' => $block]);
    }

    private function signInAdmin(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Administrador']);
        $user->roles()->attach($role);
        Sanctum::actingAs($user);
    }

    private function cabin(): Cabin
    {
        $type = CabinType::create(['name' => 'Tipo prueba', 'slug' => 'tipo-prueba', 'base_price' => 0, 'max_guests' => 8, 'bedrooms' => 1, 'bathrooms' => 1, 'is_active' => true]);

        return Cabin::create(['cabin_type_id' => $type->id, 'name' => 'Cabaña prueba', 'slug' => 'cabana-prueba', 'code' => 'PRUEBA', 'status' => CabinStatus::Available, 'guest_capacity' => 4, 'min_guests' => 1, 'max_guests' => 8, 'beds_count' => 2, 'bathrooms_count' => 1, 'map_slot' => 'cabana_1', 'is_active' => true, 'sort_order' => 1]);
    }

    private function reservation(Cabin $cabin, array $overrides = []): Reservation
    {
        $record = Reservation::create(array_merge(['cabin_id' => $cabin->id, 'check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'guests_count' => 2, 'leader_name' => 'Grupo prueba', 'status' => ReservationStatus::Confirmed], $overrides));
        $record->cabins()->sync([$cabin->id]);

        return $record;
    }
}
