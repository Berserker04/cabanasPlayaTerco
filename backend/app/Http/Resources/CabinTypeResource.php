<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'slug'              => $this->slug,
            'description'       => $this->description,
            'short_description' => $this->short_description,
            'base_price'        => (float) $this->base_price,
            'max_guests'        => $this->max_guests,
            'bedrooms'          => $this->bedrooms,
            'bathrooms'         => $this->bathrooms,
            'size_sqm'          => $this->size_sqm ? (float) $this->size_sqm : null,
            'image'             => $this->image,
            'is_active'         => $this->is_active,
            'sort_order'        => $this->sort_order,
            'amenities'         => AmenityResource::collection($this->whenLoaded('amenities')),
            'media'             => CabinMediaResource::collection($this->whenLoaded('media')),
            'cabins_count'      => $this->whenCounted('cabins'),
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
