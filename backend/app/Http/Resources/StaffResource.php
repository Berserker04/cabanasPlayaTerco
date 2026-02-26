<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'full_name'       => $this->full_name,
            'document_number' => $this->document_number,
            'phone'           => $this->phone,
            'email'           => $this->email,
            'role'            => $this->role->value,
            'role_label'      => $this->role->label(),
            'is_active'       => $this->is_active,
            'hire_date'       => $this->hire_date?->format('Y-m-d'),
            'notes'           => $this->notes,
            'payments_count'  => $this->whenCounted('payments'),
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
