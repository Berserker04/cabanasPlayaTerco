<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinMapPointResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'key' => $this->key, 'label' => $this->label,
            'x' => $this->x, 'y' => $this->y, 'sort_order' => $this->sort_order,
            'cabin_id' => $this->whenLoaded('cabin', fn () => $this->cabin?->id),
            'cabin_deleted' => $this->whenLoaded('cabin', fn () => $this->cabin?->trashed() ?? false),
        ];
    }
}
