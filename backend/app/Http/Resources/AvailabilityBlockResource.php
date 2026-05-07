<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'check_in'       => $this->check_in->format('Y-m-d'),
            'check_out'      => $this->check_out->format('Y-m-d'),
            'reason'         => $this->reason,
            'notes'          => $this->notes,
            'applies_to_all' => $this->applies_to_all,
            'cabin_ids'      => $this->whenLoaded('cabins', fn () => $this->cabins->pluck('id')->values()),
            'cabins'         => CabinResource::collection($this->whenLoaded('cabins')),
            'creator'        => new UserResource($this->whenLoaded('creator')),
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
