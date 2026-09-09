<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cabin_type_id' => $this->cabin_type_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'code' => $this->code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'floor' => $this->floor,
            'notes' => $this->notes,
            'cover_image' => $this->cover_image,
            'cover_image_path' => $this->cover_image_path,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'guest_capacity' => $this->guest_capacity,
            'min_guests' => $this->min_guests,
            'max_guests' => $this->max_guests,
            'beds_count' => $this->beds_count,
            'bathrooms_count' => $this->bathrooms_count,
            'map_slot' => $this->map_slot,
            'map_point' => new CabinMapPointResource($this->whenLoaded('mapPoint')),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'type' => new CabinTypeResource($this->whenLoaded('type')),
            'media' => CabinMediaResource::collection($this->whenLoaded('media')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
