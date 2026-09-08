<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationContactTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Administrador']);
        $user->roles()->attach($role);
        Sanctum::actingAs($user);
        $type = CabinType::create(['name' => 'Contacto', 'slug' => 'contacto', 'base_price' => 0, 'max_guests' => 8, 'bedrooms' => 1, 'bathrooms' => 1, 'is_active' => true]);
        $cabin = Cabin::create(['cabin_type_id' => $type->id, 'name' => 'Contacto', 'slug' => 'contacto', 'code' => 'CONTACT', 'map_slot' => 'cabana_1', 'status' => CabinStatus::Available, 'guest_capacity' => 4, 'min_guests' => 1, 'max_guests' => 8, 'beds_count' => 2, 'bathrooms_count' => 1, 'is_active' => true]);

        return ['cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12', 'guests_count' => 4, 'leader_name' => 'Contacto de prueba', 'status' => 'confirmed'];
    }

    public function test_contacts_and_origin_round_trip_through_detail_agenda_and_planner(): void
    {
        $phone = '+57 300 555 0100';
        $id = $this->postJson('/api/v1/admin/reservations', $this->payload() + ['leader_phone' => $phone, 'leader_whatsapp' => $phone, 'source' => 'phone'])
            ->assertCreated()->assertJsonPath('data.leader_phone', $phone)->assertJsonPath('data.leader_whatsapp', $phone)->assertJsonPath('data.source', 'phone')->json('data.id');
        $this->getJson('/api/v1/admin/reservations/'.$id)->assertOk()->assertJsonPath('data.leader_phone', $phone);
        $this->getJson('/api/v1/admin/availability/agenda?from=2030-09-10&to=2030-09-12')->assertOk()
            ->assertJsonPath('data.reservations.0.leader_whatsapp', $phone)->assertJsonPath('data.reservations.0.source', 'phone');
        $this->getJson('/api/v1/admin/availability/planner?check_in=2030-09-10&check_out=2030-09-12')->assertOk()
            ->assertJsonPath('data.cabins.0.segments.0.reservation.leader_phone', $phone);
        $this->assertNotSame($phone, DB::table('reservations')->where('id', $id)->value('leader_phone'));
        $this->assertSame($phone, Reservation::findOrFail($id)->leader_phone);
    }

    public function test_different_whatsapp_partial_updates_and_clearing_contacts(): void
    {
        $id = $this->postJson('/api/v1/admin/reservations', $this->payload())->assertCreated()
            ->assertJsonPath('data.leader_phone', null)->assertJsonPath('data.leader_whatsapp', null)->json('data.id');
        $url = '/api/v1/admin/reservations/'.$id;
        $this->putJson($url, ['leader_phone' => '3005550100', 'leader_whatsapp' => '+57 310 555 0101', 'source' => 'referral'])->assertOk();
        $this->putJson($url, ['notes' => 'Conservar contacto'])->assertOk()
            ->assertJsonPath('data.leader_phone', '3005550100')->assertJsonPath('data.leader_whatsapp', '+57 310 555 0101')->assertJsonPath('data.source', 'referral');
        $this->putJson($url, ['leader_phone' => null, 'leader_whatsapp' => null])->assertOk()
            ->assertJsonPath('data.leader_phone', null)->assertJsonPath('data.leader_whatsapp', null);
    }

    public function test_invalid_contacts_are_rejected_without_changing_existing_values(): void
    {
        $payload = $this->payload();
        $this->postJson('/api/v1/admin/reservations', $payload + ['leader_phone' => '123', 'leader_whatsapp' => 'not-a-phone'])
            ->assertUnprocessable()->assertJsonValidationErrors(['leader_phone', 'leader_whatsapp']);
        $id = $this->postJson('/api/v1/admin/reservations', $payload + ['leader_phone' => '3005550100'])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/reservations/'.$id, ['leader_phone' => '1234567890123456'])
            ->assertUnprocessable()->assertJsonValidationErrors('leader_phone');
        $this->assertSame('3005550100', Reservation::findOrFail($id)->leader_phone);
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/admin/reservations/'.$id)->assertForbidden();
    }
}
