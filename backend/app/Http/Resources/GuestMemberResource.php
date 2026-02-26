<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'guest_group_id'  => $this->guest_group_id,
            'full_name'       => $this->full_name,
            'document_number' => $this->document_number,
            'document_type'   => $this->document_type,
            'age'             => $this->age,
            'is_minor'        => $this->is_minor,
            'created_at'      => $this->created_at,
        ];
    }
}
