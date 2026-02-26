<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'slug'             => $this->slug,
            'excerpt'          => $this->excerpt,
            'body'             => $this->when($request->routeIs('posts.show', 'admin.*'), $this->body),
            'featured_image'   => $this->featured_image,
            'status'           => $this->status->value,
            'status_label'     => $this->status->label(),
            'published_at'     => $this->published_at,
            'meta_title'       => $this->meta_title,
            'meta_description' => $this->meta_description,
            'author'           => new UserResource($this->whenLoaded('author')),
            'categories'       => CategoryResource::collection($this->whenLoaded('categories')),
            'tags'             => TagResource::collection($this->whenLoaded('tags')),
            'comments_count'   => $this->whenCounted('comments'),
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
