<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinAvailabilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $entry = $this->resource;

        return [
            'cabin_id' => $entry['cabin_id'],
            'map_slot' => $entry['map_slot'],
            'state' => $entry['state'],
            'tone' => $entry['tone'],
            'label' => $entry['label'],
            'is_available' => $entry['is_available'],
            'fits_guests' => $entry['fits_guests'],
            'leader_name' => $entry['leader_name'] ?? null,
            'display_color' => $entry['display_color'] ?? null,
            'reservation' => $entry['reservation'] ?? null,
            'block' => ($entry['admin'] ?? false) ? ($entry['block'] ?? null) : null,
            'cabin' => ($entry['admin'] ?? false) ? new CabinResource($entry['cabin']) : new PublicCabinResource($entry['cabin']),
        ];
    }
}
