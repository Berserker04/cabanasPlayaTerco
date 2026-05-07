<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'email'        => $this->email,
            'phone'        => $this->phone,
            'source'       => $this->source->value,
            'source_label' => $this->source->label(),
            'status'       => $this->status->value,
            'status_label' => $this->status->label(),
            'message'      => $this->message,
            'check_in'     => $this->check_in?->format('Y-m-d'),
            'check_out'    => $this->check_out?->format('Y-m-d'),
            'guests_count' => $this->guests_count,
            'cabin'        => new CabinResource($this->whenLoaded('cabin')),
            'cabin_type'   => new CabinTypeResource($this->whenLoaded('cabinType')),
            'assignee'     => new UserResource($this->whenLoaded('assignee')),
            'notes'        => $this->notes,
            'responded_at' => $this->responded_at,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
