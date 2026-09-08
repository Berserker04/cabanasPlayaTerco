<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Enums\StaffRole;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\Staff;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AvailabilityAgendaTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_agenda_requires_staff_access_and_validates_the_range(): void
    {
        $url = '/api/v1/admin/availability/agenda?from=2026-09-04&to=2026-09-18';

        $this->getJson($url)->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson($url)->assertForbidden();

        Sanctum::actingAs($this->createAdmin());

        $this->getJson('/api/v1/admin/availability/agenda')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->getJson('/api/v1/admin/availability/agenda?from=2026-09-04&to=2026-09-04')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);

        $this->getJson('/api/v1/admin/availability/agenda?from=2026-09-04&to=2026-10-06')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_agenda_returns_a_complete_empty_state(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $this->getJson('/api/v1/admin/availability/agenda?from=2026-09-04&to=2026-09-18')
            ->assertOk()
            ->assertJsonPath('data.period.from', '2026-09-04')
            ->assertJsonPath('data.period.to', '2026-09-18')
            ->assertJsonPath('data.period.nights', 14)
            ->assertJsonPath('data.summary.records_count', 0)
            ->assertJsonPath('data.summary.arrivals_count', 0)
            ->assertJsonPath('data.summary.departures_count', 0)
            ->assertJsonPath('data.summary.arriving_guests_count', 0)
            ->assertJsonPath('data.summary.departing_guests_count', 0)
            ->assertJsonPath('data.summary.active_quotes_count', 0)
            ->assertJsonPath('data.summary.blocks_count', 0)
            ->assertJsonCount(0, 'data.reservations')
            ->assertJsonCount(0, 'data.blocks');
    }

    public function test_agenda_includes_operational_records_once_and_calculates_totals(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-04 10:00:00'));
        Sanctum::actingAs($this->createAdmin());

        $firstCabin = $this->createCabin('Cabana Uno', 'cabana_1');
        $secondCabin = $this->createCabin('Cabana Dos', 'cabana_2');
        $staff = Staff::create([
            'full_name' => 'Laura Recepcion',
            'role' => StaffRole::Receptionist,
            'is_active' => true,
        ]);

        $ongoing = $this->createReservation($firstCabin, [
            'check_in' => '2026-08-28',
            'check_out' => '2026-09-20',
            'guests_count' => 2,
            'leader_name' => 'Estadia larga',
            'status' => ReservationStatus::CheckedIn,
        ]);
        $departureAtStart = $this->createReservation($firstCabin, [
            'check_in' => '2026-09-01',
            'check_out' => '2026-09-04',
            'guests_count' => 3,
            'leader_name' => 'Salida limite',
            'status' => ReservationStatus::CheckedOut,
        ]);
        $multiCabin = $this->createReservation($firstCabin, [
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-06',
            'guests_count' => 4,
            'leader_name' => 'Familia multiple',
            'status' => ReservationStatus::Confirmed,
            'assigned_to' => $staff->id,
        ], [$firstCabin->id, $secondCabin->id]);
        $legacy = $this->createReservation($secondCabin, [
            'check_in' => '2026-09-07',
            'check_out' => '2026-09-08',
            'guests_count' => 1,
            'leader_name' => 'Reserva historica',
            'status' => ReservationStatus::Confirmed,
        ], []);
        $arrivalAtEnd = $this->createReservation($secondCabin, [
            'check_in' => '2026-09-18',
            'check_out' => '2026-09-20',
            'guests_count' => 5,
            'leader_name' => 'Llegada limite',
            'status' => ReservationStatus::Confirmed,
        ]);
        $activeQuote = $this->createReservation($firstCabin, [
            'check_in' => '2026-09-09',
            'check_out' => '2026-09-11',
            'guests_count' => 2,
            'leader_name' => 'Cotizacion vigente',
            'status' => ReservationStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);
        $quoteWithoutExpiry = $this->createReservation($secondCabin, [
            'check_in' => '2026-09-11',
            'check_out' => '2026-09-13',
            'guests_count' => 2,
            'leader_name' => 'Cotizacion abierta',
            'status' => ReservationStatus::Pending,
            'expires_at' => null,
        ]);

        $excludedIds = collect([
            $this->createReservation($firstCabin, [
                'check_in' => '2026-09-10',
                'check_out' => '2026-09-12',
                'status' => ReservationStatus::Pending,
                'expires_at' => now()->subMinute(),
            ])->id,
            $this->createReservation($firstCabin, [
                'check_in' => '2026-09-10',
                'check_out' => '2026-09-12',
                'status' => ReservationStatus::Cancelled,
            ])->id,
            $this->createReservation($firstCabin, [
                'check_in' => '2026-09-10',
                'check_out' => '2026-09-12',
                'status' => ReservationStatus::NoShow,
            ])->id,
            $this->createReservation($firstCabin, [
                'check_in' => '2026-09-10',
                'check_out' => '2026-09-12',
                'status' => ReservationStatus::Expired,
            ])->id,
            $this->createReservation($firstCabin, [
                'check_in' => '2026-08-01',
                'check_out' => '2026-08-02',
                'status' => ReservationStatus::Confirmed,
            ])->id,
        ]);

        $targetedBlock = AvailabilityBlock::create([
            'check_in' => '2026-09-05',
            'check_out' => '2026-09-07',
            'reason' => 'Mantenimiento puntual',
            'applies_to_all' => false,
        ]);
        $targetedBlock->cabins()->sync([$secondCabin->id]);
        $globalBlock = AvailabilityBlock::create([
            'check_in' => '2026-09-14',
            'check_out' => '2026-09-16',
            'reason' => 'Cierre general',
            'applies_to_all' => true,
        ]);

        $response = $this->getJson('/api/v1/admin/availability/agenda?from=2026-09-04&to=2026-09-18')
            ->assertOk()
            ->assertJsonPath('data.summary.records_count', 9)
            ->assertJsonPath('data.summary.arrivals_count', 3)
            ->assertJsonPath('data.summary.departures_count', 3)
            ->assertJsonPath('data.summary.arriving_guests_count', 10)
            ->assertJsonPath('data.summary.departing_guests_count', 8)
            ->assertJsonPath('data.summary.active_quotes_count', 2)
            ->assertJsonPath('data.summary.blocks_count', 2)
            ->assertJsonCount(7, 'data.reservations')
            ->assertJsonCount(2, 'data.blocks');

        $reservations = collect($response->json('data.reservations'));
        $reservationIds = $reservations->pluck('id');

        $this->assertSame($reservationIds->unique()->count(), $reservationIds->count());
        $this->assertSame([
            $ongoing->id,
            $departureAtStart->id,
            $multiCabin->id,
            $legacy->id,
            $activeQuote->id,
            $quoteWithoutExpiry->id,
            $arrivalAtEnd->id,
        ], $reservationIds->all());
        $this->assertEmpty($reservationIds->intersect($excludedIds));

        $multiCabinPayload = $reservations->firstWhere('id', $multiCabin->id);
        $this->assertSame([$firstCabin->id, $secondCabin->id], $multiCabinPayload['cabin_ids']);
        $this->assertSame(['Cabana Uno', 'Cabana Dos'], $multiCabinPayload['cabin_names']);
        $this->assertSame('Laura Recepcion', $multiCabinPayload['assigned_staff']['full_name']);
        $this->assertArrayNotHasKey('total_price', $multiCabinPayload);

        $legacyPayload = $reservations->firstWhere('id', $legacy->id);
        $this->assertSame([$secondCabin->id], $legacyPayload['cabin_ids']);
        $this->assertSame(['Cabana Dos'], $legacyPayload['cabin_names']);

        $blocks = collect($response->json('data.blocks'));
        $this->assertSame([$targetedBlock->id, $globalBlock->id], $blocks->pluck('id')->all());
        $this->assertSame([$secondCabin->id], $blocks->firstWhere('id', $targetedBlock->id)['cabin_ids']);
        $this->assertSame([$firstCabin->id, $secondCabin->id], $blocks->firstWhere('id', $globalBlock->id)['cabin_ids']);
        $this->assertSame(['Todas las cabanas'], $blocks->firstWhere('id', $globalBlock->id)['cabin_names']);
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create();
        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['display_name' => 'Administrador'],
        );
        $admin->roles()->attach($role);

        return $admin;
    }

    private function createCabin(string $name, string $mapSlot): Cabin
    {
        $type = CabinType::create([
            'name' => 'Tipo agenda '.Str::random(6),
            'slug' => 'tipo-agenda-'.Str::random(8),
            'base_price' => 0,
            'max_guests' => 8,
            'bedrooms' => 1,
            'bathrooms' => 1,
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Cabin::create([
            'cabin_type_id' => $type->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'code' => 'AGENDA-'.Str::upper(Str::random(6)),
            'status' => CabinStatus::Available,
            'guest_capacity' => 4,
            'min_guests' => 1,
            'max_guests' => 8,
            'beds_count' => 2,
            'bathrooms_count' => 1,
            'map_slot' => $mapSlot,
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    private function createReservation(
        Cabin $cabin,
        array $overrides,
        ?array $cabinIds = null,
    ): Reservation {
        $reservation = Reservation::create(array_merge([
            'cabin_id' => $cabin->id,
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-05',
            'guests_count' => 2,
            'leader_name' => 'Grupo agenda',
            'status' => ReservationStatus::Confirmed,
        ], $overrides));

        if ($cabinIds !== []) {
            $reservation->cabins()->sync($cabinIds ?? [$cabin->id]);
        }

        return $reservation;
    }
}
