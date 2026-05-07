<?php

namespace App\Http\Resources;

use App\Enums\GalleryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GalleryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $category = $this->category instanceof GalleryCategory
            ? $this->category
            : GalleryCategory::tryFrom((string) $this->category);

        return [
            'id'               => $this->id,
            'gallery_album_id' => $this->gallery_album_id,
            'album'            => new GalleryAlbumResource($this->whenLoaded('album')),
            'url'              => $this->url,
            'path'             => $this->path,
            'thumbnail_url'    => $this->thumbnail_url,
            'thumbnail_path'   => $this->thumbnail_path,
            'alt'              => $this->alt,
            'caption'          => $this->caption,
            'category'         => $category?->value ?? $this->category,
            'category_label'   => $category?->label() ?? $this->category,
            'type'             => $this->type,
            'mime_type'        => $this->mime_type,
            'size_bytes'       => $this->size_bytes,
            'sort_order'       => $this->sort_order,
            'is_featured'      => $this->is_featured,
            'is_active'        => $this->is_active,
            'uploader'         => new UserResource($this->whenLoaded('uploader')),
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
