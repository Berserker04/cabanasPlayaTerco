<?php

namespace App\Http\Resources;

use App\Enums\GalleryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GalleryAlbumResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $category = $this->category instanceof GalleryCategory
            ? $this->category
            : GalleryCategory::tryFrom((string) $this->category);

        $cover = $this->whenLoaded('coverItem');
        $coverUrl = $cover instanceof \App\Models\GalleryItem
            ? ($cover->thumbnail_url ?? $cover->url)
            : null;

        return [
            'id'                    => $this->id,
            'title'                 => $this->title,
            'slug'                  => $this->slug,
            'description'           => $this->description,
            'category'              => $category?->value ?? $this->category,
            'category_label'        => $category?->label() ?? $this->category,
            'is_active'             => $this->is_active,
            'is_featured'           => $this->is_featured,
            'sort_order'            => $this->sort_order,
            'cover_gallery_item_id' => $this->cover_gallery_item_id,
            'cover_url'             => $coverUrl,
            'cover_item'            => new GalleryItemResource($this->whenLoaded('coverItem')),
            'items'                 => GalleryItemResource::collection($this->whenLoaded('activeItems')),
            'items_count'           => $this->whenCounted('items'),
            'active_items_count'    => $this->whenCounted('activeItems'),
            'images_count'          => $this->whenCounted('images'),
            'videos_count'          => $this->whenCounted('videos'),
            'created_at'            => $this->created_at,
            'updated_at'            => $this->updated_at,
        ];
    }
}
