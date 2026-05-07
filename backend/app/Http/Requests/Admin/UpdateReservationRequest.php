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

    protected function prepareForValidation(): void
    {
        if (! $this->has('cabin_ids') && $this->filled('cabin_id')) {
            $this->merge([
                'cabin_ids' => [$this->input('cabin_id')],
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'cabin_id'      => ['sometimes', 'exists:cabins,id'],
            'cabin_ids'     => ['sometimes', 'array', 'min:1'],
            'cabin_ids.*'   => ['integer', 'distinct', 'exists:cabins,id'],
            'check_in'      => ['sometimes', 'date'],
            'check_out'     => ['sometimes', 'date', 'after:check_in'],
            'guests_count'  => ['sometimes', 'integer', 'min:1'],
            'leader_name'   => ['nullable', 'string', 'max:255'],
            'display_color' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'status'        => ['sometimes', Rule::enum(ReservationStatus::class)],
            'source'        => ['nullable', 'string', 'max:100'],
            'notes'         => ['nullable', 'string'],
            'total_price'   => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_out.after'     => 'La fecha de salida debe ser posterior a la llegada.',
            'display_color.regex' => 'El color debe estar en formato hexadecimal, por ejemplo #0ea5e9.',
        ];
    }
}
