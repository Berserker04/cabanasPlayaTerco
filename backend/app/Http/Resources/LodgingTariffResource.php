<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LodgingTariffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'price_cop'    => (float) $this->price_cop,
            'unit_label'   => $this->unit_label,
            'description'  => $this->description,
            'includes'     => $this->includes ?? [],
            'excludes'     => $this->excludes ?? [],
            'public_notes' => $this->public_notes,
            'is_active'    => $this->is_active,
            'sort_order'   => $this->sort_order,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
