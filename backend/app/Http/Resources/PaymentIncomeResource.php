<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentIncomeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'guest_group_id' => $this->guest_group_id,
            'reservation_id' => $this->reservation_id,
            'amount'         => (float) $this->amount,
            'method'         => $this->method->value,
            'method_label'   => $this->method->label(),
            'status'         => $this->status->value,
            'status_label'   => $this->status->label(),
            'reference'      => $this->reference,
            'payment_date'   => $this->payment_date->format('Y-m-d'),
            'notes'          => $this->notes,
            'recorder'       => new UserResource($this->whenLoaded('recorder')),
            'created_at'     => $this->created_at,
        ];
    }
}
