<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'body'        => $this->body,
            'status'      => $this->status,
            'author_name' => $this->author_name ?? $this->user?->name,
            'user'        => new UserResource($this->whenLoaded('user')),
            'parent_id'   => $this->parent_id,
            'replies'     => CommentResource::collection($this->whenLoaded('replies')),
            'commentable'  => $this->whenLoaded('commentable', fn () => [
                'id' => $this->commentable?->id,
                'type' => class_basename((string) $this->commentable_type),
                'title' => $this->commentable?->title,
                'slug' => $this->commentable?->slug,
            ]),
            'created_at'  => $this->created_at,
        ];
    }
}
