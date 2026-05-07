<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewMediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'review_id' => $this->review_id,
            'url' => $this->url,
            'alt' => $this->alt,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'sort_order' => $this->sort_order,
        ];
    }
}
