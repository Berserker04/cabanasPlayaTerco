<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReservationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_id'     => ['sometimes', 'exists:cabins,id'],
            'check_in'     => ['sometimes', 'date'],
            'check_out'    => ['sometimes', 'date', 'after:check_in'],
            'guests_count' => ['sometimes', 'integer', 'min:1'],
            'status'       => ['sometimes', Rule::enum(ReservationStatus::class)],
            'source'       => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string'],
            'total_price'  => ['sometimes', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_out.after' => 'La fecha de salida debe ser posterior a la llegada.',
        ];
    }
}
