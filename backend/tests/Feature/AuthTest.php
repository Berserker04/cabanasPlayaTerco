<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public function test_admin_can_login_and_fetch_current_user(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $admin->roles()->attach(Role::create([
            'name' => 'admin',
            'display_name' => 'Administrador',
        ]));

        $response = $this->fromFrontend()->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@example.com')
            ->assertJsonPath('data.roles.0', 'admin')
            ->assertJsonPath('data.is_admin', true)
            ->assertJsonPath('data.is_staff', true);

        $this->assertAuthenticatedAs($admin);

        $this->fromFrontend()->getJson('/api/v1/auth/user')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@example.com')
            ->assertJsonPath('data.is_admin', true);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'guest@example.com',
        ]);

        $this->fromFrontend()->postJson('/api/v1/auth/login', [
            'email' => 'guest@example.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertGuest();
    }

    public function test_logout_invalidates_session(): void
    {
        $user = User::factory()->create([
            'email' => 'guest@example.com',
        ]);

        $this->fromFrontend()->postJson('/api/v1/auth/login', [
            'email' => 'guest@example.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertAuthenticatedAs($user);

        $this->fromFrontend()->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Sesion cerrada.');

        Auth::forgetGuards();

        $this->fromFrontend()->getJson('/api/v1/auth/user')->assertUnauthorized();
    }

    public function test_register_assigns_default_user_role(): void
    {
        Role::create([
            'name' => 'user',
            'display_name' => 'Usuario',
        ]);

        $this->fromFrontend()->postJson('/api/v1/auth/register', [
            'name' => 'Nuevo Usuario',
            'email' => 'nuevo@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'nuevo@example.com')
            ->assertJsonPath('data.roles.0', 'user')
            ->assertJsonPath('data.is_admin', false);

        $this->assertDatabaseHas('role_user', [
            'user_id' => User::where('email', 'nuevo@example.com')->value('id'),
            'role_id' => Role::where('name', 'user')->value('id'),
        ]);
    }

    public function test_google_redirect_returns_provider_url_and_sanitizes_next(): void
    {
        config([
            'services.google.client_id' => 'google-client',
            'services.google.client_secret' => 'google-secret',
        ]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('redirect')
            ->once()
            ->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/auth?client_id=google-client'));

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);

        $this->fromFrontend()->getJson('/api/v1/auth/google/redirect?next=https://evil.test/admin')
            ->assertOk()
            ->assertJsonPath('url', 'https://accounts.google.com/o/oauth2/auth?client_id=google-client')
            ->assertSessionHas('auth.google_next', '/');
    }

    public function test_google_callback_creates_user_and_blocks_admin_next_for_non_admin(): void
    {
        Role::create([
            'name' => 'user',
            'display_name' => 'Usuario',
        ]);

        config(['services.frontend.url' => 'http://localhost:3000']);

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-123');
        $googleUser->shouldReceive('getName')->andReturn('Google User');
        $googleUser->shouldReceive('getEmail')->andReturn('google@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->once()->andReturn($googleUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);

        $this->withSession(['auth.google_next' => '/admin'])
            ->get('/api/v1/auth/google/callback')
            ->assertRedirect('http://localhost:3000/');

        $createdUser = User::where('email', 'google@example.com')->firstOrFail();

        $this->assertAuthenticatedAs($createdUser);
        $this->assertDatabaseHas('users', [
            'email' => 'google@example.com',
            'google_id' => 'google-123',
        ]);
        $this->assertTrue($createdUser->roles()->where('name', 'user')->exists());
    }

    public function test_google_callback_does_not_log_in_suspended_user(): void
    {
        User::factory()->create([
            'name' => 'Suspended Google User',
            'email' => 'suspended-google@example.com',
            'google_id' => 'google-suspended',
            'status' => UserStatus::Suspended,
        ]);

        config(['services.frontend.url' => 'http://localhost:3000']);

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-suspended');
        $googleUser->shouldReceive('getEmail')->andReturn('suspended-google@example.com');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->once()->andReturn($googleUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);

        $this->get('/api/v1/auth/google/callback')
            ->assertRedirect('http://localhost:3000/login?error=suspended');

        $this->assertGuest();
    }

    private function fromFrontend(): static
    {
        return $this
            ->withHeader('Origin', 'http://localhost:3000')
            ->withHeader('Referer', 'http://localhost:3000');
    }
}
