<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'cabin_id'     => $this->cabin_id,
            'user_id'      => $this->user_id,
            'check_in'     => $this->check_in->format('Y-m-d'),
            'check_out'    => $this->check_out->format('Y-m-d'),
            'guests_count' => $this->guests_count,
            'status'       => $this->status->value,
            'status_label' => $this->status->label(),
            'source'       => $this->source,
            'notes'        => $this->notes,
            'total_price'  => (float) $this->total_price,
            'created_by'   => $this->created_by,
            'cabin'        => new CabinResource($this->whenLoaded('cabin')),
            'user'         => new UserResource($this->whenLoaded('user')),
            'guest_group'  => new GuestGroupResource($this->whenLoaded('guestGroup')),
            'payments'     => PaymentIncomeResource::collection($this->whenLoaded('payments')),
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
