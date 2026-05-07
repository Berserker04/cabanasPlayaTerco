<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isStaff = (bool) $viewer?->isStaff();
        $isOwner = $viewer && (int) $viewer->id === (int) $this->user_id;
        $canSeePrivateFields = $isStaff || $isOwner;
        $canSeeResponse = $isStaff || $isOwner || $this->status?->value === 'approved';

        return [
            'id' => $this->id,
            'user_id' => $this->when($canSeePrivateFields, $this->user_id),
            'reservation_id' => $this->when($canSeePrivateFields, $this->reservation_id),
            'author_name' => $this->author_name,
            'author_email' => $this->when($canSeePrivateFields, $this->author_email),
            'author_avatar' => $this->whenLoaded('author', fn () => $this->author?->avatar),
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'approved_at' => $this->approved_at,
            'admin_response' => $this->when($canSeeResponse, $this->admin_response),
            'responded_at' => $this->when($canSeeResponse, $this->responded_at),
            'responded_by' => $this->when($isStaff, $this->responded_by),
            'media' => ReviewMediaResource::collection($this->whenLoaded('media')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
