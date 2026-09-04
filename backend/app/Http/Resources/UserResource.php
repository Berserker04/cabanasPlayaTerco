<?php

namespace App\Http\Resources;

use App\Enums\UserStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roleNames = $this->relationLoaded('roles')
            ? $this->roles->pluck('name')->values()
            : collect();
        $status = $this->status instanceof UserStatus
            ? $this->status
            : UserStatus::tryFrom((string) $this->status) ?? UserStatus::Active;

        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'avatar'            => $this->avatar,
            'email_verified_at' => $this->email_verified_at,
            'roles'             => $this->whenLoaded('roles', fn () => $roleNames),
            'role_ids'          => $this->whenLoaded('roles', fn () => $this->roles->pluck('id')->values()),
            'status'            => $status->value,
            'status_label'      => $status->label(),
            'is_admin'          => $this->relationLoaded('roles')
                ? $roleNames->intersect(['admin', 'super-admin'])->isNotEmpty()
                : $this->isAdmin(),
            'is_staff'          => $this->relationLoaded('roles')
                ? $roleNames->intersect(['admin', 'super-admin', 'staff'])->isNotEmpty()
                : $this->isStaff(),
            'created_at'        => $this->created_at,
        ];
    }
}
