<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PanelAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public static function roles(): array
    {
        return [
            'administrator' => [['admin'], true, true, true],
            'staff' => [['staff'], true, true, false],
            'viewer' => [['viewer'], true, false, false],
            'registered user' => [['user'], false, false, false],
            'no roles' => [[], false, false, false],
            'staff and viewer' => [['staff', 'viewer'], true, true, false],
            'admin and viewer' => [['admin', 'viewer'], true, true, true],
        ];
    }

    #[DataProvider('roles')]
    public function test_password_login_exposes_panel_access_without_granting_viewers_staff_permissions(
        array $roles, bool $canEnter, bool $isStaff, bool $isAdmin
    ): void {
        $user = $this->userWithRoles($roles);
        $this->withHeader('Origin', 'http://localhost:3000')
            ->withHeader('Referer', 'http://localhost:3000')
            ->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.can_access_panel', $canEnter)
            ->assertJsonPath('data.is_staff', $isStaff)
            ->assertJsonPath('data.is_admin', $isAdmin);

        $this->getJson('/api/v1/auth/user')->assertOk()->assertJsonPath('data.can_access_panel', $canEnter);
    }

    public static function panelRoles(): array
    {
        return ['administrator' => ['admin'], 'staff' => ['staff'], 'viewer' => ['viewer']];
    }

    #[DataProvider('panelRoles')]
    public function test_panel_roles_can_read_the_operational_screens(string $role): void
    {
        Sanctum::actingAs($this->userWithRoles([$role]));
        foreach ([
            '/dashboard/stats', '/dashboard/operations', '/cabins', '/cabin-types',
            '/lodging-tariffs', '/amenities', '/reservations', '/availability-blocks', '/staff/options',
            '/availability?check_in=2030-09-10&check_out=2030-09-12',
            '/availability/planner?check_in=2030-09-10&check_out=2030-09-12',
            '/availability/agenda?from=2030-09-10&to=2030-09-12',
            '/availability/calendar?month=2030-09',
        ] as $path) {
            $this->getJson('/api/v1/admin'.$path)->assertOk();
        }
    }

    public static function restrictedRoles(): array
    {
        return ['staff' => ['staff'], 'viewer' => ['viewer']];
    }

    #[DataProvider('restrictedRoles')]
    public function test_non_administrators_cannot_manage_users_or_site_content(string $role): void
    {
        Sanctum::actingAs($this->userWithRoles([$role]));
        foreach (['/users', '/reviews', '/posts', '/comments', '/gallery', '/gallery-albums', '/staff'] as $path) {
            $this->getJson('/api/v1/admin'.$path)->assertForbidden();
        }
        foreach (['/cabins', '/cabin-types', '/lodging-tariffs', '/amenities', '/posts', '/staff'] as $path) {
            $this->postJson('/api/v1/admin'.$path, [])->assertForbidden();
        }
    }

    public function test_viewer_is_denied_every_registered_panel_write_route(): void
    {
        Sanctum::actingAs($this->userWithRoles(['viewer', 'user']));
        // Exercise authorization independently of whether the requested record exists.
        $this->withoutMiddleware(SubstituteBindings::class);
        $checked = 0;
        foreach (Route::getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/admin/')) {
                continue;
            }
            $uri = '/'.preg_replace('/\{[^}]+\}/', '1', $route->uri());
            foreach (array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']) as $method) {
                $this->json($method, $uri, [])->assertForbidden();
                $checked++;
            }
        }
        $this->assertGreaterThan(30, $checked);
        $this->assertDatabaseCount('reservations', 0);
        $this->assertDatabaseCount('availability_blocks', 0);
    }

    public static function operators(): array
    {
        return ['staff' => [['staff']], 'staff and viewer' => [['staff', 'viewer']], 'admin and viewer' => [['admin', 'viewer']]];
    }

    #[DataProvider('operators')]
    public function test_operators_can_complete_a_reservation_and_block_cycle(array $roles): void
    {
        Sanctum::actingAs($this->userWithRoles($roles));
        $cabin = $this->cabin();
        $record = $this->postJson('/api/v1/admin/reservations', [
            'cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12',
            'guests_count' => 2, 'leader_name' => 'Grupo de prueba', 'status' => 'pending',
        ])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/reservations/'.$record, ['status' => 'confirmed'])->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$record, ['status' => 'cancelled'])->assertOk();

        $block = $this->postJson('/api/v1/admin/availability-blocks', [
            'cabin_ids' => [$cabin->id], 'check_in' => '2030-09-10', 'check_out' => '2030-09-12',
            'reason' => 'Mantenimiento', 'applies_to_all' => false,
        ])->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/availability-blocks/'.$block, ['reason' => 'Reparación'])->assertOk();

        Sanctum::actingAs($this->userWithRoles(['viewer']));
        $this->getJson('/api/v1/admin/reservations/'.$record)->assertOk();
        $this->getJson('/api/v1/admin/availability-blocks/'.$block)->assertOk();
        $this->getJson('/api/v1/admin/cabins/'.$cabin->id)->assertOk();
        $this->putJson('/api/v1/admin/reservations/'.$record, ['status' => 'confirmed'])->assertForbidden();
        $this->deleteJson('/api/v1/admin/reservations/'.$record)->assertForbidden();
        $this->putJson('/api/v1/admin/availability-blocks/'.$block, ['reason' => 'No autorizado'])->assertForbidden();
        $this->deleteJson('/api/v1/admin/availability-blocks/'.$block)->assertForbidden();
        $this->assertDatabaseHas('reservations', ['id' => $record, 'status' => 'cancelled']);
        $this->assertDatabaseHas('availability_blocks', ['id' => $block, 'reason' => 'Reparación', 'deleted_at' => null]);

        Sanctum::actingAs($this->userWithRoles($roles));
        $this->deleteJson('/api/v1/admin/availability-blocks/'.$block)->assertOk();
        $this->assertSoftDeleted('availability_blocks', ['id' => $block]);
    }

    public function test_guests_regular_users_and_suspended_accounts_cannot_access_the_panel(): void
    {
        $this->getJson('/api/v1/admin/dashboard/operations')->assertUnauthorized();
        foreach ([[], ['user']] as $roles) {
            Sanctum::actingAs($this->userWithRoles($roles));
            $this->getJson('/api/v1/admin/dashboard/operations')->assertForbidden();
            $this->getJson('/api/v1/admin/cabins')->assertForbidden();
        }
        foreach (['admin', 'staff', 'viewer'] as $role) {
            $user = $this->userWithRoles([$role]);
            $user->update(['status' => UserStatus::Suspended]);
            $this->assertFalse($user->canAccessPanel());
            Sanctum::actingAs($user);
            $this->getJson('/api/v1/admin/dashboard/operations')->assertForbidden();
        }
    }

    #[DataProvider('restrictedRoles')]
    public function test_google_login_sends_staff_and_viewers_to_the_panel(string $role): void
    {
        $user = $this->userWithRoles([$role]);
        config(['services.frontend.url' => 'http://localhost:3000']);
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-panel');
        $googleUser->shouldReceive('getName')->andReturn($user->name);
        $googleUser->shouldReceive('getEmail')->andReturn($user->email);
        $googleUser->shouldReceive('getAvatar')->andReturn(null);
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->once()->andReturn($googleUser);
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);

        $this->withSession(['auth.google_next' => '/'])->get('/api/v1/auth/google/callback')
            ->assertRedirect('http://localhost:3000/admin');
        $this->assertAuthenticatedAs($user);
    }

    private function userWithRoles(array $names): User
    {
        $user = User::factory()->create();
        foreach ($names as $name) {
            $role = Role::firstOrCreate(['name' => $name], ['display_name' => $name]);
            $user->roles()->attach($role);
        }

        return $user;
    }

    private function cabin(): Cabin
    {
        $type = CabinType::create(['name' => 'Tipo prueba', 'slug' => 'tipo-prueba', 'base_price' => 0, 'max_guests' => 8]);

        return Cabin::create([
            'cabin_type_id' => $type->id, 'name' => 'Cabaña prueba', 'slug' => 'cabana-prueba',
            'code' => 'PRUEBA', 'status' => 'available', 'min_guests' => 1, 'max_guests' => 8,
            'guest_capacity' => 8, 'map_slot' => 'cabana_1', 'is_active' => true,
        ]);
    }
}
