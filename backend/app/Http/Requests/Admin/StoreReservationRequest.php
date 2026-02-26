<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReservationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_id'     => ['required', 'exists:cabins,id'],
            'user_id'      => ['nullable', 'exists:users,id'],
            'check_in'     => ['required', 'date'],
            'check_out'    => ['required', 'date', 'after:check_in'],
            'guests_count' => ['required', 'integer', 'min:1'],
            'status'       => ['sometimes', Rule::enum(ReservationStatus::class)],
            'source'       => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string'],
            'total_price'  => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'cabin_id.required'     => 'La cabaña es obligatoria.',
            'check_in.required'     => 'La fecha de llegada es obligatoria.',
            'check_out.required'    => 'La fecha de salida es obligatoria.',
            'check_out.after'       => 'La fecha de salida debe ser posterior a la llegada.',
            'guests_count.required' => 'El número de huéspedes es obligatorio.',
            'total_price.required'  => 'El precio total es obligatorio.',
        ];
    }
}
