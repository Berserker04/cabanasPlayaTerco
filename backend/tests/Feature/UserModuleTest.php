<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\DeviceToken;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    public function test_admin_can_search_filter_and_paginate_users_with_catalog_and_counts(): void
    {
        $adminRole = $this->createRole('admin', 'Administrador');
        $staffRole = $this->createRole('staff', 'Personal');
        $userRole = $this->createRole('user', 'Usuario');

        $admin = $this->createUserWithRoles([$adminRole]);
        $matchingUser = $this->createUserWithRoles([$staffRole, $userRole], [
            'name' => 'Ana del Pacifico',
            'email' => 'ana@example.com',
            'phone' => '3147427806',
        ]);
        $this->createUserWithRoles([$userRole], [
            'name' => 'Suspendido',
            'status' => UserStatus::Suspended,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users?search=314742&role=staff&status=active&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matchingUser->id)
            ->assertJsonPath('data.0.status', UserStatus::Active->value)
            ->assertJsonPath('data.0.status_label', 'Activo')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.counts.total', 3)
            ->assertJsonPath('meta.counts.active', 2)
            ->assertJsonPath('meta.counts.suspended', 1)
            ->assertJsonPath('meta.counts.active_admins', 1)
            ->assertJsonCount(3, 'meta.available_roles')
            ->assertJsonFragment([
                'name' => 'staff',
                'display_name' => 'Personal',
            ]);
    }

    public function test_user_admin_endpoints_require_authentication_and_admin_role(): void
    {
        $this->getJson('/api/v1/admin/users')->assertUnauthorized();

        $staff = $this->createUserWithRoles([
            $this->createRole('staff', 'Personal'),
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/v1/admin/users')->assertForbidden();
    }

    public function test_admin_can_update_multiple_roles_and_suspend_and_reactivate_user(): void
    {
        $adminRole = $this->createRole('admin', 'Administrador');
        $staffRole = $this->createRole('staff', 'Personal');
        $userRole = $this->createRole('user', 'Usuario');
        $admin = $this->createUserWithRoles([$adminRole]);
        $target = $this->createUserWithRoles([$userRole]);

        $plainTextToken = $target->createToken('existing-mobile-session')->plainTextToken;
        DeviceToken::create([
            'user_id' => $target->id,
            'token' => 'push-token-for-suspended-user',
            'platform' => 'android',
            'device_name' => 'Test device',
        ]);
        DB::table('sessions')->insert([
            'id' => 'existing-web-session',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test-session',
            'last_activity' => now()->timestamp,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'role_ids' => [$staffRole->id, $userRole->id],
            'status' => UserStatus::Suspended->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Suspended->value)
            ->assertJsonPath('data.status_label', 'Suspendido')
            ->assertJsonCount(2, 'data.role_ids')
            ->assertJsonFragment(['message' => 'Usuario actualizado.']);

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'status' => UserStatus::Suspended->value,
        ]);
        $this->assertDatabaseHas('role_user', ['user_id' => $target->id, 'role_id' => $staffRole->id]);
        $this->assertDatabaseHas('role_user', ['user_id' => $target->id, 'role_id' => $userRole->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $target->id]);
        $this->assertDatabaseMissing('device_tokens', ['user_id' => $target->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $target->id]);

        Auth::forgetGuards();

        $this->withToken($plainTextToken)
            ->getJson('/api/v1/auth/user')
            ->assertUnauthorized();

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/users/{$target->id}", [
            'status' => UserStatus::Active->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Active->value);
    }

    public function test_admin_cannot_suspend_last_active_admin_or_remove_own_admin_role(): void
    {
        $adminRole = $this->createRole('admin', 'Administrador');
        $userRole = $this->createRole('user', 'Usuario');
        $admin = $this->createUserWithRoles([$adminRole]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/users/{$admin->id}", [
            'status' => UserStatus::Suspended->value,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $secondAdmin = $this->createUserWithRoles([$adminRole]);

        $this->putJson("/api/v1/admin/users/{$admin->id}", [
            'role_ids' => [$userRole->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role_ids']);

        $this->assertTrue($admin->fresh()->roles()->where('name', 'admin')->exists());
        $this->assertTrue($secondAdmin->fresh()->isActive());
    }

    public function test_update_requires_valid_non_empty_roles_or_status(): void
    {
        $adminRole = $this->createRole('admin', 'Administrador');
        $userRole = $this->createRole('user', 'Usuario');
        $admin = $this->createUserWithRoles([$adminRole]);
        $target = $this->createUserWithRoles([$userRole]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/users/{$target->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->putJson("/api/v1/admin/users/{$target->id}", ['role_ids' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role_ids']);

        $this->putJson("/api/v1/admin/users/{$target->id}", ['role_ids' => [999999]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role_ids.0']);
    }

    public function test_suspended_user_cannot_log_in_or_use_an_authenticated_session(): void
    {
        $staffRole = $this->createRole('staff', 'Personal');
        $suspendedUser = $this->createUserWithRoles([$staffRole], [
            'email' => 'suspended@example.com',
            'password' => Hash::make('secret-password'),
            'status' => UserStatus::Suspended,
        ]);

        $this->fromFrontend()->postJson('/api/v1/auth/login', [
            'email' => $suspendedUser->email,
            'password' => 'secret-password',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Tu cuenta esta suspendida. Contacta a un administrador.');

        $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $suspendedUser->email,
            'password' => 'secret-password',
            'device_name' => 'Android test',
        ])->assertForbidden();

        Sanctum::actingAs($suspendedUser);

        $this->getJson('/api/v1/auth/user')->assertForbidden();
    }

    private function createRole(string $name, string $displayName): Role
    {
        return Role::firstOrCreate(
            ['name' => $name],
            ['display_name' => $displayName],
        );
    }

    /**
     * @param  array<int, Role>  $roles
     */
    private function createUserWithRoles(array $roles, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->roles()->attach(array_map(fn (Role $role): int => $role->id, $roles));

        return $user->fresh()->load('roles');
    }

    private function fromFrontend(): static
    {
        return $this
            ->withHeader('Origin', 'http://localhost:3000')
            ->withHeader('Referer', 'http://localhost:3000');
    }
}
