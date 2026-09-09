<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicCabinResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'slug' => $this->slug,
            'floor' => $this->floor, 'cover_image' => $this->cover_image,
            'short_description' => $this->short_description, 'description' => $this->description,
            'guest_capacity' => $this->guest_capacity, 'min_guests' => $this->min_guests,
            'max_guests' => $this->max_guests, 'beds_count' => $this->beds_count,
            'bathrooms_count' => $this->bathrooms_count, 'map_slot' => $this->map_slot,
            'map_point' => new CabinMapPointResource($this->whenLoaded('mapPoint')),
            'sort_order' => $this->sort_order,
            'media' => $this->whenLoaded('media', fn () => $this->media->map(fn ($media) => [
                'id' => $media->id, 'url' => $media->url, 'alt' => $media->alt,
                'type' => $media->type, 'mime_type' => $media->mime_type,
                'size_bytes' => $media->size_bytes, 'sort_order' => $media->sort_order,
            ])),
        ];
    }
}
