<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'staff_id'     => $this->staff_id,
            'amount'       => (float) $this->amount,
            'concept'      => $this->concept,
            'payment_date' => $this->payment_date->format('Y-m-d'),
            'method'       => $this->method,
            'reference'    => $this->reference,
            'notes'        => $this->notes,
            'recorder'     => new UserResource($this->whenLoaded('recorder')),
            'staff'        => new StaffResource($this->whenLoaded('staff')),
            'created_at'   => $this->created_at,
        ];
    }
}
