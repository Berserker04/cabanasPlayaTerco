<?php

namespace App\Services;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserAdministrationService
{
    /**
     * @param  array{role_ids?: array<int, int>, status?: string}  $attributes
     */
    public function update(User $actor, User $target, array $attributes): User
    {
        return DB::transaction(function () use ($actor, $target, $attributes): User {
            $lockedTarget = User::query()
                ->with('roles')
                ->lockForUpdate()
                ->findOrFail($target->getKey());

            $adminRole = Role::query()
                ->where('name', 'admin')
                ->lockForUpdate()
                ->first();

            $currentStatus = $lockedTarget->status;
            $nextStatus = array_key_exists('status', $attributes)
                ? UserStatus::from($attributes['status'])
                : $currentStatus;

            $currentRoleIds = $lockedTarget->roles->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $nextRoleIds = array_key_exists('role_ids', $attributes)
                ? array_values(array_map('intval', $attributes['role_ids']))
                : $currentRoleIds;

            $currentlyAdmin = $adminRole !== null && in_array((int) $adminRole->getKey(), $currentRoleIds, true);
            $willBeAdmin = $adminRole !== null && in_array((int) $adminRole->getKey(), $nextRoleIds, true);
            $willRemainActiveAdmin = $willBeAdmin && $nextStatus === UserStatus::Active;

            if ($currentlyAdmin && $currentStatus === UserStatus::Active && ! $willRemainActiveAdmin) {
                $otherActiveAdministratorExists = User::query()
                    ->whereKeyNot($lockedTarget->getKey())
                    ->where('status', UserStatus::Active)
                    ->whereHas('roles', fn ($query) => $query->where('roles.name', 'admin'))
                    ->lockForUpdate()
                    ->exists();

                if (! $otherActiveAdministratorExists) {
                    throw ValidationException::withMessages([
                        'status' => ['No puedes suspender o degradar al ultimo administrador activo.'],
                    ]);
                }
            }

            if ($lockedTarget->is($actor)) {
                if ($nextStatus === UserStatus::Suspended) {
                    throw ValidationException::withMessages([
                        'status' => ['No puedes suspender tu propia cuenta.'],
                    ]);
                }

                if ($currentlyAdmin && ! $willBeAdmin) {
                    throw ValidationException::withMessages([
                        'role_ids' => ['No puedes quitarte tu propio rol de administrador.'],
                    ]);
                }
            }

            if (array_key_exists('role_ids', $attributes)) {
                $lockedTarget->roles()->sync($nextRoleIds);
            }

            if (array_key_exists('status', $attributes)) {
                $lockedTarget->update(['status' => $nextStatus]);
            }

            $updated = $lockedTarget->fresh()->load('roles');
            if (! $updated->canAccessPanel()) {
                $this->revokeAccess($updated);
            } elseif (! $updated->isStaff()) {
                $updated->deviceTokens()->delete();
            }

            return $updated;
        });
    }

    private function revokeAccess(User $user): void
    {
        $user->tokens()->delete();
        $user->deviceTokens()->delete();

        DB::table('sessions')
            ->where('user_id', $user->getKey())
            ->delete();
    }
}
