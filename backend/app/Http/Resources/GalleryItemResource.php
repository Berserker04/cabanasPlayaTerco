<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GalleryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'url'           => $this->url,
            'thumbnail_url' => $this->thumbnail_url,
            'alt'           => $this->alt,
            'caption'       => $this->caption,
            'category'      => $this->category->value,
            'category_label'=> $this->category->label(),
            'type'          => $this->type,
            'sort_order'    => $this->sort_order,
            'is_featured'   => $this->is_featured,
            'uploader'      => new UserResource($this->whenLoaded('uploader')),
            'created_at'    => $this->created_at,
        ];
    }
}
