<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roleNames = $this->relationLoaded('roles')
            ? $this->roles->pluck('name')->values()
            : collect();

        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'avatar'            => $this->avatar,
            'email_verified_at' => $this->email_verified_at,
            'roles'             => $this->whenLoaded('roles', fn () => $roleNames),
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
