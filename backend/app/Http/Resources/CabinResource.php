<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'cabin_type_id'=> $this->cabin_type_id,
            'name'         => $this->name,
            'code'         => $this->code,
            'status'       => $this->status->value,
            'status_label' => $this->status->label(),
            'floor'        => $this->floor,
            'notes'        => $this->notes,
            'type'         => new CabinTypeResource($this->whenLoaded('type')),
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
