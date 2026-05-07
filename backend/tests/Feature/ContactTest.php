<?php

namespace Tests\Feature;

use App\Mail\ContactLeadAutoresponse;
use App\Mail\ContactLeadNotification;
use App\Models\CabinType;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_contact_form_creates_lead_and_sends_emails(): void
    {
        Mail::fake();

        $cabinType = $this->createCabinType();

        $response = $this->postJson('/api/v1/contact', [
            'name'          => '  Maria Perez  ',
            'email'         => '  MARIA@example.com ',
            'phone'         => '314 742 7806',
            'message'       => 'Quiero cotizar una estadia familiar frente al mar.',
            'check_in'      => now()->addDays(10)->format('Y-m-d'),
            'check_out'     => now()->addDays(13)->format('Y-m-d'),
            'guests_count'  => 4,
            'cabin_type_id' => $cabinType->id,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Tu mensaje ha sido enviado. Te contactaremos pronto.')
            ->assertJsonPath('meta.email_sent', true)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'source',
                    'status',
                    'message',
                    'check_in',
                    'check_out',
                    'guests_count',
                    'cabin_type',
                ],
                'message',
                'meta' => ['email_sent'],
            ]);

        $this->assertDatabaseHas('leads', [
            'name'          => 'Maria Perez',
            'email'         => 'maria@example.com',
            'phone'         => '314 742 7806',
            'guests_count'  => 4,
            'cabin_type_id' => $cabinType->id,
            'source'        => 'website',
            'status'        => 'new',
        ]);

        $lead = Lead::firstOrFail();

        Mail::assertSent(ContactLeadNotification::class, function (ContactLeadNotification $mail) use ($lead): bool {
            return $mail->lead->is($lead);
        });

        Mail::assertSent(ContactLeadAutoresponse::class, function (ContactLeadAutoresponse $mail) use ($lead): bool {
            return $mail->lead->is($lead);
        });
    }

    public function test_contact_form_requires_core_fields(): void
    {
        $this->postJson('/api/v1/contact', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_contact_form_validates_dates_and_guest_count(): void
    {
        $validPayload = [
            'name'    => 'Carlos Ruiz',
            'email'   => 'carlos@example.com',
            'phone'   => '314 742 7806',
            'message' => 'Quiero consultar disponibilidad para una estadia.',
        ];

        $cases = [
            [['email' => 'correo-invalido'], ['email']],
            [['check_in' => now()->addDays(5)->format('Y-m-d')], ['check_out']],
            [['check_out' => now()->addDays(7)->format('Y-m-d')], ['check_in']],
            [
                [
                    'check_in'  => now()->addDays(7)->format('Y-m-d'),
                    'check_out' => now()->addDays(6)->format('Y-m-d'),
                ],
                ['check_out'],
            ],
            [['check_in' => now()->subDay()->format('Y-m-d'), 'check_out' => now()->addDay()->format('Y-m-d')], ['check_in']],
            [['guests_count' => 0], ['guests_count']],
            [['guests_count' => 21], ['guests_count']],
            [['cabin_type_id' => 999], ['cabin_type_id']],
        ];

        foreach ($cases as [$override, $fields]) {
            $this->postJson('/api/v1/contact', array_merge($validPayload, $override))
                ->assertUnprocessable()
                ->assertJsonValidationErrors($fields);
        }
    }

    private function createCabinType(): CabinType
    {
        return CabinType::create([
            'name'        => 'Cabana familiar',
            'slug'        => 'cabana-familiar',
            'base_price'  => 320000,
            'max_guests'  => 6,
            'bedrooms'    => 2,
            'bathrooms'   => 1,
            'is_active'   => true,
            'sort_order'  => 1,
        ]);
    }
}
