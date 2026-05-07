<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CabinMediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'cabin_id'     => $this->cabin_id,
            'cabin_type_id'=> $this->cabin_type_id,
            'url'          => $this->url,
            'path'         => $this->path,
            'alt'          => $this->alt,
            'type'         => $this->type,
            'mime_type'    => $this->mime_type,
            'size_bytes'   => $this->size_bytes,
            'sort_order'   => $this->sort_order,
            'cabin'        => new CabinResource($this->whenLoaded('cabin')),
        ];
    }
}
