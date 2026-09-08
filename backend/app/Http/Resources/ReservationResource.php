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
            'leader_name'  => $this->leader_name,
            'leader_phone' => $this->leader_phone,
            'leader_whatsapp' => $this->leader_whatsapp,
            'display_color'=> $this->display_color,
            'expires_at'   => $this->expires_at?->toISOString(),
            'confirmed_at' => $this->confirmed_at?->toISOString(),
            'is_expired_quote' => $this->isExpiredQuote(),
            'expires_soon' => $this->isQuoteExpiringSoon(),
            'status'       => $this->status->value,
            'status_label' => $this->status->label(),
            'source'       => $this->source,
            'notes'        => $this->notes,
            'total_price'  => $this->total_price !== null ? (float) $this->total_price : null,
            'total_paid'   => (float) ($this->total_paid ?? 0),
            'balance_due'  => $this->total_price !== null
                ? max(0, (float) $this->total_price - (float) ($this->total_paid ?? 0))
                : null,
            'created_by'   => $this->created_by,
            'assigned_to'  => $this->assigned_to,
            'assigned_staff' => new StaffResource($this->whenLoaded('assignedStaff')),
            'cabin'        => new CabinResource($this->whenLoaded('cabin')),
            'cabins'       => CabinResource::collection($this->whenLoaded('cabins')),
            'user'         => new UserResource($this->whenLoaded('user')),
            'guest_group'  => new GuestGroupResource($this->whenLoaded('guestGroup')),
            'payments'     => PaymentIncomeResource::collection($this->whenLoaded('payments')),
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
