<?php

namespace Tests\Feature;

use App\Mail\ContactLeadAutoresponse;
use App\Mail\ContactLeadNotification;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Lead;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicGroupQuoteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\Carbon::parse('2030-06-01 12:00:00', 'America/Bogota'));
        $this->withoutMiddleware(ThrottleRequests::class);
        Mail::fake();
        Http::fake();
    }

    public function test_group_capacity_combines_free_cabins_including_unmapped_cabins(): void
    {
        $this->cabin(['max_guests' => 4, 'map_slot' => 'cabana_1']);
        $unmapped = $this->cabin(['max_guests' => 6]);
        foreach ([2 => true, 8 => true, 10 => true, 11 => false, 50 => false] as $guests => $fits) {
            $response = $this->getJson($this->url($guests))->assertOk()
                ->assertJsonPath('data.guests', $guests)
                ->assertJsonPath('data.summary.available_count', 2)
                ->assertJsonPath('data.summary.available_capacity', 10)
                ->assertJsonPath('data.summary.can_host_guests', $fits);
            $entries = collect($response->json('data.available_cabins'));
            $this->assertCount(2, $entries);
            $this->assertNull($entries->firstWhere('cabin_id', $unmapped->id)['map_slot']);
            if ($guests === 8) {
                $this->assertTrue($entries->every(fn (array $entry) => ! $entry['fits_guests'] && $entry['is_available']));
            }
            $this->assertStringContainsString($fits ? 'Hay capacidad libre estimada' : 'No alcanza para todo el grupo', $response->json('data.message'));
            $this->assertStringContainsString('La disponibilidad está sujeta a confirmación.', $response->json('data.message'));
        }
    }

    public function test_capacity_counts_only_published_operational_cabins_free_for_the_whole_stay(): void
    {
        $free = $this->cabin(['max_guests' => 4]);
        $reserved = $this->cabin();
        $blocked = $this->cabin();
        $quoted = $this->cabin(['max_guests' => 6]);
        $hidden = $this->cabin(['is_active' => false]);
        $inactive = $this->cabin(['status' => 'inactive']);
        $deleted = $this->cabin();
        $deleted->delete();
        $this->cabin(['status' => 'maintenance']);
        $this->reserve($reserved, 'confirmed', '2030-06-11', '2030-06-13');
        $this->reserve($quoted, 'pending', '2030-06-10', '2030-06-12');
        // Adjacent stays do not block the first or final night of this query.
        $this->reserve($free, 'confirmed', '2030-06-08', '2030-06-10');
        $this->reserve($free, 'confirmed', '2030-06-12', '2030-06-14');
        $block = AvailabilityBlock::create(['check_in' => '2030-06-10', 'check_out' => '2030-06-11', 'reason' => 'Private maintenance', 'notes' => 'Internal note', 'applies_to_all' => false]);
        $block->cabins()->attach($blocked->id);
        Sanctum::actingAs(User::factory()->create());
        $response = $this->getJson($this->url(10))->assertOk()
            ->assertJsonPath('data.summary.available_capacity', 10)
            ->assertJsonPath('data.summary.can_host_guests', true);
        $ids = collect($response->json('data.cabins'))->pluck('cabin_id');
        foreach ([$hidden, $inactive, $deleted] as $cabin) {
            $this->assertNotContains($cabin->id, $ids);
        }
        $this->assertEqualsCanonicalizing([$free->id, $quoted->id], collect($response->json('data.available_cabins'))->pluck('cabin_id')->all());
        $this->assertStringNotContainsString('Internal note', $response->getContent());
        $this->assertStringNotContainsString('Private maintenance', $response->getContent());
        $this->assertStringNotContainsString('"cover_image_path"', $response->getContent());
        $this->assertStringNotContainsString('"notes"', $response->getContent());
    }

    public function test_zero_capacity_still_accepts_a_general_quote_without_assigning_or_blocking(): void
    {
        $this->getJson($this->url(12))->assertOk()
            ->assertJsonPath('data.summary.can_host_guests', false)
            ->assertJsonPath('data.summary.available_capacity', 0);
        $this->postJson('/api/v1/contact', $this->payload())->assertCreated()->assertJsonPath('data.cabin_id', null);
        $lead = Lead::firstOrFail();
        $this->assertNull($lead->cabin_id);
        $this->assertNull($lead->cabin_type_id);
        $this->assertEquals(12, $lead->guests_count);
        $this->assertSame('2030-06-10', $lead->check_in->toDateString());
        $this->assertDatabaseCount('reservations', 0);
        $this->assertDatabaseCount('availability_blocks', 0);
        $this->assertDatabaseCount('reservation_cabin', 0);
        Mail::assertSent(ContactLeadNotification::class);
        Mail::assertSent(ContactLeadAutoresponse::class);
        $this->assertStringContainsString('Asignación de cabañas a cargo del administrador', (new ContactLeadNotification($lead))->render());
        $this->assertStringContainsString('Esta solicitud no confirma una reserva', (new ContactLeadAutoresponse($lead))->render());
    }

    public function test_mail_failure_keeps_the_general_request_and_reports_receipt(): void
    {
        Mail::shouldReceive('to')->once()->andThrow(new \RuntimeException('Simulated mail outage'));
        $this->postJson('/api/v1/contact', $this->payload())->assertCreated()->assertJsonPath('meta.email_sent', false);
        $this->assertDatabaseCount('leads', 1);
        $this->assertDatabaseCount('reservations', 0);
        $this->assertNull(Lead::firstOrFail()->cabin_id);
    }

    public function test_public_search_validates_actual_dates_and_guest_limits(): void
    {
        foreach ([0, 51, '2.5', 'abc'] as $guests) {
            $this->getJson($this->url($guests))->assertUnprocessable()->assertJsonValidationErrors('guests');
        }
        $this->getJson('/api/v1/availability?check_in=2030-02-30&check_out=2030-06-12&guests=2')->assertUnprocessable()->assertJsonValidationErrors('check_in');
        $this->getJson('/api/v1/availability?check_in=2030-06-10&check_out=2030-06-10&guests=2')->assertUnprocessable()->assertJsonValidationErrors('check_out');
        $this->getJson($this->url(1))->assertOk();
        $this->getJson($this->url(50))->assertOk();
    }

    private function cabin(array $overrides = []): Cabin
    {
        $type = CabinType::firstOrCreate(['slug' => 'group-quote'], ['name' => 'Grupo QA', 'base_price' => 100000, 'max_guests' => 8, 'bedrooms' => 1, 'bathrooms' => 1, 'is_active' => true]);
        $number = Cabin::withTrashed()->count() + 1;

        return Cabin::create([...['cabin_type_id' => $type->id, 'name' => 'Grupo QA '.$number, 'slug' => 'group-qa-'.$number, 'code' => 'GROUP-'.$number, 'status' => 'available', 'is_active' => true, 'min_guests' => 1, 'guest_capacity' => 4, 'max_guests' => 8, 'beds_count' => 2, 'bathrooms_count' => 1, 'map_slot' => null, 'notes' => 'Internal note'], ...$overrides]);
    }

    private function reserve(Cabin $cabin, string $status, string $from, string $to): void
    {
        $reservation = Reservation::create(['cabin_id' => $cabin->id, 'check_in' => $from, 'check_out' => $to, 'guests_count' => 2, 'status' => $status, 'expires_at' => now()->addDays(20)]);
        $reservation->cabins()->attach($cabin->id);
    }

    private function url(int|string $guests): string
    {
        return '/api/v1/availability?'.http_build_query(['check_in' => '2030-06-10', 'check_out' => '2030-06-12', 'guests' => $guests]);
    }

    private function payload(): array
    {
        return ['name' => 'Grupo QA', 'email' => 'group@example.test', 'message' => 'Quisiera recibir una cotización general para mi grupo.', 'check_in' => '2030-06-10', 'check_out' => '2030-06-12', 'guests_count' => 12];
    }
}
