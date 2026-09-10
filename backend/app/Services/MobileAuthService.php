<?php

namespace App\Services;

use App\Enums\UserStatus;
use App\Models\DeviceToken;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class MobileAuthService
{
    public function passwordUser(string $email, string $password): User
    {
        $user = User::query()
            ->where('email', $email)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son correctas.'],
            ]);
        }

        $this->ensureActive($user);

        return $user->load('roles');
    }

    /**
     * @param  array{name: string, email: string, password: string, phone?: string|null}  $attributes
     */
    public function registerPending(array $attributes): User
    {
        return DB::transaction(function () use ($attributes): User {
            $user = User::create([
                'name' => $attributes['name'],
                'email' => $attributes['email'],
                'password' => Hash::make($attributes['password']),
                'phone' => $attributes['phone'] ?? null,
            ]);

            $this->assignDefaultRole($user);

            return $user->load('roles');
        });
    }

    /**
     * @param  array{sub: string, email: string, name: string, avatar: string|null}  $identity
     */
    public function resolveGoogleUser(array $identity): User
    {
        return DB::transaction(function () use ($identity): User {
            $googleUser = User::withTrashed()
                ->where('google_id', $identity['sub'])
                ->lockForUpdate()
                ->first();
            $emailUser = User::withTrashed()
                ->where('email', $identity['email'])
                ->lockForUpdate()
                ->first();

            if ($googleUser && $emailUser && ! $googleUser->is($emailUser)) {
                throw new HttpException(409, 'La cuenta de Google está asociada a otro usuario.');
            }

            $user = $googleUser ?? $emailUser;

            if ($user?->trashed()) {
                throw new HttpException(403, 'Esta cuenta ya no está disponible.');
            }

            if ($user && $user->google_id && $user->google_id !== $identity['sub']) {
                throw new HttpException(409, 'El correo ya está vinculado a otra cuenta de Google.');
            }

            if ($user) {
                $this->ensureActive($user);
                $user->forceFill([
                    'google_id' => $identity['sub'],
                    'name' => $identity['name'],
                    'email' => $identity['email'],
                    'avatar' => $identity['avatar'],
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();
            } else {
                $user = User::create([
                    'name' => $identity['name'],
                    'email' => $identity['email'],
                    'google_id' => $identity['sub'],
                    'avatar' => $identity['avatar'],
                    'email_verified_at' => now(),
                    'password' => Hash::make(Str::password(32)),
                ]);
            }

            $this->assignDefaultRole($user);

            return $user->fresh()->load('roles');
        });
    }

    /**
     * @param  array{device_name?: string|null, platform?: string|null, push_token?: string|null}  $device
     */
    public function issueToken(User $user, array $device): string
    {
        $this->ensureActive($user);

        if (! $user->canAccessPanel()) {
            throw new HttpException(403, 'Tu acceso al panel está pendiente de aprobación.');
        }

        $accessToken = $user->createToken($device['device_name'] ?? 'mobile', ['mobile']);

        if ($user->isStaff() && ! empty($device['push_token'])) {
            DeviceToken::updateOrCreate(
                ['token' => $device['push_token']],
                [
                    'user_id' => $user->id,
                    'personal_access_token_id' => $accessToken->accessToken->id,
                    'platform' => $device['platform'] ?? null,
                    'device_name' => $device['device_name'] ?? null,
                    'last_used_at' => now(),
                ],
            );
        }

        return $accessToken->plainTextToken;
    }

    public function approvalRequired(User $user): bool
    {
        return ! $user->canAccessPanel();
    }

    private function assignDefaultRole(User $user): void
    {
        if ($user->roles()->exists()) {
            return;
        }

        $role = Role::query()->where('name', 'user')->first();

        if ($role) {
            $user->roles()->attach($role);
        }
    }

    private function ensureActive(User $user): void
    {
        if ($user->status === UserStatus::Suspended) {
            throw new HttpException(403, 'Tu cuenta está suspendida. Contacta a un administrador.');
        }
    }
}
