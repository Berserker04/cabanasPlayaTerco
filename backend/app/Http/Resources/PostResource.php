<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'summary' => $this->summary,
            'body' => $this->when(
                $this->relationLoaded('comments')
                    || $request->is('api/v1/admin/*')
                    || $request->is('api/v1/me/*'),
                $this->body,
            ),
            'featured_image' => $this->featured_image,
            'cover_media_id' => $this->whenLoaded('media', fn () => $this->media->firstWhere('url', $this->featured_image)?->id),
            'cover_image_path' => $this->when($request->is('api/v1/admin/*', 'api/v1/me/*'), $this->cover_image_path),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'published_at' => $this->published_at,
            'visit_date' => $this->visit_date,
            'travel_style' => $this->travel_style,
            'media_count' => $this->media_count,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'author' => new UserResource($this->whenLoaded('author')),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'media' => PostMediaResource::collection($this->whenLoaded('media')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'comments_count' => $this->whenCounted('comments'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
