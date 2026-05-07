<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'uuid'          => $this->uuid,
            'type'          => $this->type->value,
            'type_label'    => $this->type->label(),
            'url'           => $this->url,
            'path'          => $this->path,
            'original_name' => $this->original_name,
            'mime_type'     => $this->mime_type,
            'size_bytes'    => $this->size_bytes,
            'uploader'      => new UserResource($this->whenLoaded('uploader')),
            'created_at'    => $this->created_at,
        ];
    }
}
