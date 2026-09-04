<?php

namespace Tests\Feature;

use App\Contracts\GoogleIdentityVerifier;
use App\Enums\CabinStatus;
use App\Enums\ExpenseStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Enums\UserStatus;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\DeviceToken;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;
use UnexpectedValueException;

class MobileAdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_login_issues_bearer_token_and_registers_device(): void
    {
        $admin = $this->createAdmin([
            'email' => 'admin-mobile@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/mobile/login', [
            'email' => 'admin-mobile@example.com',
            'password' => 'password',
            'device_name' => 'Pixel Playa',
            'platform' => 'android',
            'push_token' => 'fcm-token-1',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'admin-mobile@example.com')
            ->assertJsonStructure(['data' => ['token']]);

        $this->assertDatabaseHas('device_tokens', [
            'user_id' => $admin->id,
            'token' => 'fcm-token-1',
            'platform' => 'android',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$response->json('data.token'))
            ->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk();
    }

    public function test_mobile_password_login_returns_pending_for_non_staff_user(): void
    {
        $user = User::factory()->create([
            'email' => 'pending@example.com',
        ]);
        $this->assignUserRole($user);

        $this->postJson('/api/v1/auth/mobile/login', [
            'email' => 'pending@example.com',
            'password' => 'password',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.user.email', 'pending@example.com')
            ->assertJsonPath('data.approval_required', true)
            ->assertJsonMissingPath('data.token');
    }

    public function test_mobile_registration_creates_pending_user_without_token(): void
    {
        Role::create([
            'name' => 'user',
            'display_name' => 'Usuario',
        ]);

        $this->postJson('/api/v1/auth/mobile/register', [
            'name' => 'Nueva Operadora',
            'email' => 'nueva-operadora@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.user.email', 'nueva-operadora@example.com')
            ->assertJsonPath('data.user.roles.0', 'user')
            ->assertJsonPath('data.approval_required', true)
            ->assertJsonMissingPath('data.token');
    }

    public function test_mobile_google_login_creates_pending_user(): void
    {
        Role::create([
            'name' => 'user',
            'display_name' => 'Usuario',
        ]);
        config(['services.google.client_id' => 'web-client-id']);
        $this->fakeGoogleIdentity([
            'sub' => 'google-pending',
            'email' => 'google-pending@example.com',
            'name' => 'Google Pending',
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $this->postJson('/api/v1/auth/mobile/google', [
            'id_token' => 'valid-id-token',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.user.email', 'google-pending@example.com')
            ->assertJsonPath('data.approval_required', true);

        $this->assertDatabaseHas('users', [
            'email' => 'google-pending@example.com',
            'google_id' => 'google-pending',
        ]);
    }

    public function test_mobile_google_login_issues_token_for_existing_staff_user(): void
    {
        $staff = User::factory()->create([
            'email' => 'staff-google@example.com',
        ]);
        $staffRole = Role::create([
            'name' => 'staff',
            'display_name' => 'Personal',
        ]);
        $staff->roles()->attach($staffRole);

        config(['services.google.client_id' => 'web-client-id']);
        $this->fakeGoogleIdentity([
            'sub' => 'google-staff',
            'email' => 'staff-google@example.com',
            'name' => 'Staff Google',
            'avatar' => null,
        ]);

        $this->postJson('/api/v1/auth/mobile/google', [
            'id_token' => 'valid-id-token',
            'device_name' => 'Android Playa',
            'platform' => 'android',
            'push_token' => 'google-push-token',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.is_staff', true)
            ->assertJsonPath('data.approval_required', false)
            ->assertJsonStructure(['data' => ['token']]);

        $this->assertDatabaseHas('device_tokens', [
            'user_id' => $staff->id,
            'token' => 'google-push-token',
        ]);
    }

    public function test_mobile_google_login_rejects_invalid_identity(): void
    {
        config(['services.google.client_id' => 'web-client-id']);

        $verifier = Mockery::mock(GoogleIdentityVerifier::class);
        $verifier->shouldReceive('verify')
            ->once()
            ->with('invalid-id-token')
            ->andThrow(new UnexpectedValueException('Token inválido.'));
        $this->app->instance(GoogleIdentityVerifier::class, $verifier);

        $this->postJson('/api/v1/auth/mobile/google', [
            'id_token' => 'invalid-id-token',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Token inválido.');
    }

    public function test_mobile_google_login_rejects_suspended_user(): void
    {
        $user = User::factory()->create([
            'email' => 'suspended-mobile-google@example.com',
            'google_id' => 'google-suspended-mobile',
            'status' => UserStatus::Suspended,
        ]);
        $this->assignUserRole($user);

        config(['services.google.client_id' => 'web-client-id']);
        $this->fakeGoogleIdentity([
            'sub' => 'google-suspended-mobile',
            'email' => 'suspended-mobile-google@example.com',
            'name' => 'Suspendida',
            'avatar' => null,
        ]);

        $this->postJson('/api/v1/auth/mobile/google', [
            'id_token' => 'valid-id-token',
        ])->assertForbidden();
    }

    public function test_availability_planner_segments_conflicts_and_suggests_available_cabins(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $type = $this->createCabinType();
        $reserved = $this->createCabin([
            'cabin_type_id' => $type->id,
            'name' => 'Cabana Reservada',
            'map_slot' => 'cabana_1',
            'max_guests' => 6,
        ]);
        $available = $this->createCabin([
            'cabin_type_id' => $type->id,
            'name' => 'Cabana Disponible',
            'slug' => 'cabana-disponible',
            'code' => 'CAB-DISP',
            'map_slot' => 'cabana_2',
            'max_guests' => 8,
        ]);

        $reservation = Reservation::create([
            'cabin_id' => $reserved->id,
            'check_in' => '2030-12-10',
            'check_out' => '2030-12-15',
            'guests_count' => 5,
            'leader_name' => 'Grupo Diciembre',
            'status' => ReservationStatus::Confirmed,
            'confirmed_at' => now(),
            'total_price' => 1200000,
        ]);
        $reservation->cabins()->sync([$reserved->id]);

        $response = $this->getJson('/api/v1/admin/availability/planner?check_in=2030-12-10&check_out=2030-12-20&guests=6')
            ->assertOk()
            ->assertJsonPath('data.summary.can_host_guests', true);

        $cabins = collect($response->json('data.cabins'));
        $reservedEntry = $cabins->firstWhere('cabin_id', $reserved->id);

        $this->assertFalse($reservedEntry['available_for_range']);
        $this->assertSame('reserved', $reservedEntry['segments'][0]['state']);
        $this->assertSame('2030-12-10', $reservedEntry['segments'][0]['check_in']);
        $this->assertSame('2030-12-15', $reservedEntry['segments'][0]['check_out']);
        $this->assertSame('Grupo Diciembre', $reservedEntry['segments'][0]['reservation']['leader_name']);

        $suggestions = collect($response->json('data.suggestions'));
        $this->assertTrue($suggestions->contains(fn (array $suggestion) => $suggestion['cabin_ids'] === [$available->id]));
    }

    public function test_payments_reservation_balance_and_future_expenses_power_simple_cashbox(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $cabin = $this->createCabin();
        $reservation = Reservation::create([
            'cabin_id' => $cabin->id,
            'check_in' => '2030-07-01',
            'check_out' => '2030-07-05',
            'guests_count' => 4,
            'status' => ReservationStatus::Confirmed,
            'confirmed_at' => now(),
            'total_price' => 1000000,
        ]);
        $reservation->cabins()->sync([$cabin->id]);

        $this->postJson('/api/v1/admin/payments', [
            'reservation_id' => $reservation->id,
            'amount' => 350000,
            'method' => PaymentMethod::Transfer->value,
            'status' => PaymentStatus::Completed->value,
            'payment_date' => '2030-06-01',
            'reference' => 'TRX-100',
        ])
            ->assertCreated()
            ->assertJsonPath('data.guest_group_id', null);

        $this->getJson("/api/v1/admin/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.total_paid', 350000)
            ->assertJsonPath('data.balance_due', 650000);

        $this->postJson('/api/v1/admin/expenses', [
            'category' => 'Mantenimiento',
            'description' => 'Compra de pintura',
            'amount' => 180000,
            'status' => ExpenseStatus::Pending->value,
            'due_date' => '2030-06-15',
        ])
            ->assertCreated();

        $this->getJson('/api/v1/admin/expenses/summary?month=2030-06')
            ->assertOk()
            ->assertJsonPath('data.total_pending', 180000)
            ->assertJsonPath('data.pending_count', 1);
    }

    public function test_contact_lead_triggers_push_notification_for_registered_staff_devices(): void
    {
        config(['services.firebase.server_key' => 'test-fcm-key']);
        Http::fake([
            'https://fcm.googleapis.com/fcm/send' => Http::response(['success' => 1], 200),
        ]);

        $admin = $this->createAdmin();
        DeviceToken::create([
            'user_id' => $admin->id,
            'token' => 'staff-device-token',
            'platform' => 'android',
        ]);

        $this->postJson('/api/v1/contact', [
            'name' => 'Cliente Playa',
            'email' => 'cliente@example.com',
            'phone' => '+573001112233',
            'message' => 'Quiero una cotizacion para mi familia.',
            'check_in' => '2030-12-10',
            'check_out' => '2030-12-15',
            'guests_count' => 5,
        ])->assertCreated();

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://fcm.googleapis.com/fcm/send'
                && $request['registration_ids'] === ['staff-device-token']
                && $request['data']['type'] === 'lead.created';
        });
    }

    private function createAdmin(array $overrides = []): User
    {
        $user = User::factory()->create($overrides);
        $role = Role::firstOrCreate(
            ['name' => 'admin'],
            ['display_name' => 'Administrador'],
        );
        $user->roles()->attach($role);

        return $user;
    }

    /**
     * @param  array{sub: string, email: string, name: string, avatar: string|null}  $identity
     */
    private function fakeGoogleIdentity(array $identity): void
    {
        $verifier = Mockery::mock(GoogleIdentityVerifier::class);
        $verifier->shouldReceive('verify')
            ->once()
            ->with('valid-id-token')
            ->andReturn($identity);
        $this->app->instance(GoogleIdentityVerifier::class, $verifier);
    }

    private function assignUserRole(User $user): void
    {
        $role = Role::firstOrCreate(
            ['name' => 'user'],
            ['display_name' => 'Usuario'],
        );
        $user->roles()->attach($role);
    }

    private function createCabinType(array $overrides = []): CabinType
    {
        return CabinType::create(array_merge([
            'name' => 'Cabana Playa Terco',
            'slug' => 'cabana-playa-terco-test-'.Str::random(8),
            'description' => 'Tipo interno para pruebas.',
            'short_description' => 'Tipo interno.',
            'base_price' => 0,
            'max_guests' => 8,
            'bedrooms' => 0,
            'bathrooms' => 0,
            'is_active' => true,
            'sort_order' => 0,
        ], $overrides));
    }

    private function createCabin(array $overrides = []): Cabin
    {
        $cabinTypeId = $overrides['cabin_type_id'] ?? $this->createCabinType()->id;

        return Cabin::create(array_merge([
            'cabin_type_id' => $cabinTypeId,
            'name' => 'Cabana Terco',
            'slug' => 'cabana-terco-'.Str::random(8),
            'code' => 'CAB-'.Str::upper(Str::random(6)),
            'status' => CabinStatus::Available,
            'floor' => 1,
            'cover_image' => 'https://example.test/cabana.jpg',
            'short_description' => 'Descanso frente al mar.',
            'description' => 'Cabana real para pruebas.',
            'guest_capacity' => 4,
            'min_guests' => 1,
            'max_guests' => 8,
            'beds_count' => 3,
            'bathrooms_count' => 1,
            'map_slot' => 'cabana_1',
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides));
    }
}
