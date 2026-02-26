<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'reservation_id'          => $this->reservation_id,
            'titular_name'            => $this->titular_name,
            'titular_email'           => $this->titular_email,
            'titular_phone'           => $this->titular_phone,
            'titular_document_number' => $this->titular_document_number,
            'titular_document_type'   => $this->titular_document_type,
            'city_of_origin'          => $this->city_of_origin,
            'notes'                   => $this->notes,
            'members'                 => GuestMemberResource::collection($this->whenLoaded('members')),
            'members_count'           => $this->whenCounted('members'),
            'reservation'             => new ReservationResource($this->whenLoaded('reservation')),
            'created_at'              => $this->created_at,
            'updated_at'              => $this->updated_at,
        ];
    }
}
