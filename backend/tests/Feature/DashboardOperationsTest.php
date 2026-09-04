<?php

namespace Tests\Feature;

use App\Enums\CabinStatus;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Lead;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_operations_require_staff_access_and_validate_the_year(): void
    {
        $this->getJson('/api/v1/admin/dashboard/operations')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/admin/dashboard/operations')->assertForbidden();

        Sanctum::actingAs($this->createAdmin());
        $this->getJson('/api/v1/admin/dashboard/operations?year=2019')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['year']);
        $this->getJson('/api/v1/admin/dashboard/operations?year=2101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['year']);
    }

    public function test_operations_return_a_complete_zero_state_without_inventory_or_reservations(): void
    {
        $this->travelToDashboardTime('2026-09-04 10:00:00');
        Sanctum::actingAs($this->createAdmin());

        $this->getJson('/api/v1/admin/dashboard/operations')
            ->assertOk()
            ->assertJsonPath('data.period.year', 2026)
            ->assertJsonPath('data.period.available_years', [2026])
            ->assertJsonPath('data.period.timezone', 'America/Bogota')
            ->assertJsonPath('data.today.operational_cabins', 0)
            ->assertJsonPath('data.today.occupancy_rate', 0)
            ->assertJsonPath('data.next_7_days.arrivals_count', 0)
            ->assertJsonPath('data.alerts.active_quotes', 0)
            ->assertJsonCount(12, 'data.months')
            ->assertJsonPath('data.months.0.label', 'Ene')
            ->assertJsonPath('data.months.11.label', 'Dic')
            ->assertJsonPath('data.months.0.operational_nights', 0);
    }

    public function test_occupancy_uses_operational_cabin_nights_blocks_and_valid_stays(): void
    {
        $this->travelToDashboardTime('2026-01-15 10:00:00');
        Sanctum::actingAs($this->createAdmin());

        $available = $this->createCabin(['name' => 'Cabana Uno', 'map_slot' => 'cabana_1']);
        $occupied = $this->createCabin([
            'name' => 'Cabana Dos',
            'map_slot' => 'cabana_2',
            'status' => CabinStatus::Occupied,
        ]);
        $this->createCabin([
            'name' => 'En mantenimiento',
            'map_slot' => 'cabana_3',
            'status' => CabinStatus::Maintenance,
        ]);
        $this->createCabin([
            'name' => 'Inactiva',
            'map_slot' => 'cabana_4',
            'is_active' => false,
        ]);

        $targetedBlock = AvailabilityBlock::create([
            'check_in' => '2026-01-10',
            'check_out' => '2026-01-12',
            'reason' => 'Fumigacion',
            'applies_to_all' => false,
        ]);
        $targetedBlock->cabins()->sync([$occupied->id]);

        AvailabilityBlock::create([
            'check_in' => '2026-03-01',
            'check_out' => '2026-03-03',
            'reason' => 'Cierre general',
            'applies_to_all' => true,
        ]);

        $this->createReservation($available, [
            'check_in' => '2025-12-30',
            'check_out' => '2026-01-03',
            'guests_count' => 4,
            'status' => ReservationStatus::Confirmed,
        ]);
        $this->createReservation($available, [
            'check_in' => '2026-01-31',
            'check_out' => '2026-02-02',
            'guests_count' => 2,
            'status' => ReservationStatus::CheckedOut,
        ]);
        $this->createReservation($occupied, [
            'check_in' => '2026-01-15',
            'check_out' => '2026-01-16',
            'guests_count' => 3,
            'status' => ReservationStatus::Confirmed,
        ]);
        $this->createReservation($available, [
            'check_in' => '2026-02-05',
            'check_out' => '2026-02-07',
            'guests_count' => 8,
            'status' => ReservationStatus::CheckedIn,
        ], [$available->id, $occupied->id]);

        foreach ([
            ReservationStatus::Pending,
            ReservationStatus::Cancelled,
            ReservationStatus::NoShow,
            ReservationStatus::Expired,
        ] as $status) {
            $this->createReservation($available, [
                'check_in' => '2026-01-20',
                'check_out' => '2026-01-21',
                'guests_count' => 20,
                'status' => $status,
            ]);
        }

        $response = $this->getJson('/api/v1/admin/dashboard/operations?year=2026')
            ->assertOk()
            ->assertJsonPath('data.period.available_years', [2026, 2025])
            ->assertJsonPath('data.today.operational_cabins', 2)
            ->assertJsonPath('data.today.blocked_cabins', 0)
            ->assertJsonPath('data.today.occupied_cabins', 1)
            ->assertJsonPath('data.today.occupancy_rate', 50)
            ->assertJsonPath('data.months.0.operational_nights', 60)
            ->assertJsonPath('data.months.0.occupied_nights', 4)
            ->assertJsonPath('data.months.0.occupancy_rate', 6.7)
            ->assertJsonPath('data.months.0.reservations_count', 2)
            ->assertJsonPath('data.months.0.guests_count', 5)
            ->assertJsonPath('data.months.1.operational_nights', 56)
            ->assertJsonPath('data.months.1.occupied_nights', 5)
            ->assertJsonPath('data.months.1.occupancy_rate', 8.9)
            ->assertJsonPath('data.months.1.reservations_count', 1)
            ->assertJsonPath('data.months.1.guests_count', 8)
            ->assertJsonPath('data.months.2.operational_nights', 58);

        $this->assertCount(12, $response->json('data.months'));
    }

    public function test_arrivals_alerts_and_available_years_are_complete_and_ordered(): void
    {
        $now = $this->travelToDashboardTime('2026-09-04 10:00:00');
        Sanctum::actingAs($this->createAdmin());
        $cabin = $this->createCabin(['name' => 'Cabana Principal', 'map_slot' => 'cabana_1']);
        $arrivalIds = [];

        foreach (range(0, 7) as $index) {
            $arrival = $this->createReservation($cabin, [
                'check_in' => $now->addDays($index)->format('Y-m-d'),
                'check_out' => $now->addDays($index + 1)->format('Y-m-d'),
                'guests_count' => $index + 1,
                'leader_name' => "Llegada {$index}",
                'status' => ReservationStatus::Confirmed,
            ]);
            $arrivalIds[] = $arrival->id;
        }

        $this->createReservation($cabin, [
            'check_in' => '2026-09-12',
            'check_out' => '2026-09-13',
            'guests_count' => 50,
            'status' => ReservationStatus::Confirmed,
        ]);
        $this->createReservation($cabin, [
            'check_in' => '2026-09-04',
            'check_out' => '2026-09-05',
            'guests_count' => 50,
            'status' => ReservationStatus::CheckedIn,
        ]);
        $this->createReservation($cabin, [
            'check_in' => '2028-01-01',
            'check_out' => '2028-01-02',
            'guests_count' => 2,
            'status' => ReservationStatus::Confirmed,
        ]);

        $this->createQuote($cabin, $now->addHours(24));
        $this->createQuote($cabin, $now->addHours(6));
        $this->createQuote($cabin, null);
        $this->createQuote($cabin, $now->subHour());

        Review::create([
            'author_name' => 'Visitante uno',
            'rating' => 5,
            'body' => 'Excelente estadia.',
            'status' => ReviewStatus::Pending,
        ]);
        Review::create([
            'author_name' => 'Visitante dos',
            'rating' => 4,
            'body' => 'Muy buena experiencia.',
            'status' => ReviewStatus::Pending,
        ]);
        Review::create([
            'author_name' => 'Visitante tres',
            'rating' => 5,
            'body' => 'Todo perfecto.',
            'status' => ReviewStatus::Approved,
        ]);

        foreach ([LeadStatus::New, LeadStatus::New, LeadStatus::Contacted] as $index => $status) {
            Lead::create([
                'name' => "Contacto {$index}",
                'source' => LeadSource::Website,
                'status' => $status,
            ]);
        }

        $response = $this->getJson('/api/v1/admin/dashboard/operations?year=2027')
            ->assertOk()
            ->assertJsonPath('data.period.year', 2027)
            ->assertJsonPath('data.period.available_years', [2028, 2027, 2026])
            ->assertJsonPath('data.next_7_days.from', '2026-09-04')
            ->assertJsonPath('data.next_7_days.to', '2026-09-11')
            ->assertJsonPath('data.next_7_days.arrivals_count', 8)
            ->assertJsonPath('data.next_7_days.guests_count', 36)
            ->assertJsonCount(6, 'data.next_7_days.arrivals')
            ->assertJsonPath('data.next_7_days.arrivals.0.id', $arrivalIds[0])
            ->assertJsonPath('data.next_7_days.arrivals.0.cabin_names', ['Cabana Principal'])
            ->assertJsonPath('data.next_7_days.arrivals.5.id', $arrivalIds[5])
            ->assertJsonPath('data.alerts.active_quotes', 3)
            ->assertJsonPath('data.alerts.expiring_quotes_next_12_hours', 1)
            ->assertJsonPath('data.alerts.pending_reviews', 2)
            ->assertJsonPath('data.alerts.unanswered_leads', 2);

        $this->assertSame(0, collect($response->json('data.months'))->sum('reservations_count'));
    }

    private function travelToDashboardTime(string $dateTime): CarbonImmutable
    {
        config(['dashboard.timezone' => 'America/Bogota']);
        $now = CarbonImmutable::parse($dateTime, 'America/Bogota');
        CarbonImmutable::setTestNow($now);

        return $now;
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

    private function createCabin(array $overrides = []): Cabin
    {
        $type = CabinType::create([
            'name' => 'Cabana dashboard '.Str::random(6),
            'slug' => 'cabana-dashboard-'.Str::random(8),
            'base_price' => 0,
            'max_guests' => 8,
            'bedrooms' => 1,
            'bathrooms' => 1,
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Cabin::create(array_merge([
            'cabin_type_id' => $type->id,
            'name' => 'Cabana '.Str::random(6),
            'slug' => 'unidad-'.Str::random(8),
            'code' => 'DASH-'.Str::upper(Str::random(6)),
            'status' => CabinStatus::Available,
            'guest_capacity' => 4,
            'min_guests' => 1,
            'max_guests' => 8,
            'beds_count' => 2,
            'bathrooms_count' => 1,
            'map_slot' => 'cabana_1',
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides));
    }

    private function createReservation(Cabin $cabin, array $overrides, ?array $cabinIds = null): Reservation
    {
        $reservation = Reservation::create(array_merge([
            'cabin_id' => $cabin->id,
            'check_in' => '2026-01-01',
            'check_out' => '2026-01-02',
            'guests_count' => 2,
            'leader_name' => 'Grupo dashboard',
            'status' => ReservationStatus::Confirmed,
        ], $overrides));
        $reservation->cabins()->sync($cabinIds ?? [$cabin->id]);

        return $reservation;
    }

    private function createQuote(Cabin $cabin, ?CarbonImmutable $expiresAt): Reservation
    {
        return $this->createReservation($cabin, [
            'check_in' => '2026-09-20',
            'check_out' => '2026-09-22',
            'guests_count' => 2,
            'status' => ReservationStatus::Pending,
            'expires_at' => $expiresAt,
        ]);
    }
}
