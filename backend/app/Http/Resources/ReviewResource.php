<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'reservation_id' => $this->reservation_id,
            'author_name'    => $this->author_name,
            'author_email'   => $this->when($request->user()?->isStaff(), $this->author_email),
            'rating'         => $this->rating,
            'title'          => $this->title,
            'body'           => $this->body,
            'status'         => $this->status->value,
            'status_label'   => $this->status->label(),
            'approved_at'    => $this->approved_at,
            'media'          => ReviewMediaResource::collection($this->whenLoaded('media')),
            'created_at'     => $this->created_at,
        ];
    }
}
