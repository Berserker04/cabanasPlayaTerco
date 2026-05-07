<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostMediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'post_id' => $this->post_id,
            'url' => $this->url,
            'path' => $this->when($request->is('api/v1/admin/*', 'api/v1/me/*'), $this->path),
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'type' => $this->type,
            'alt' => $this->alt,
            'sort_order' => $this->sort_order,
            'created_at' => $this->created_at,
        ];
    }
}
