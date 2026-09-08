<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReservationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'check_out'     => ['sometimes', 'date'],
            'guests_count'  => ['sometimes', 'integer', 'min:1'],
            'leader_name'   => ['nullable', 'string', 'max:255'],
            'leader_phone' => ['nullable', 'string', 'max:40', 'regex:/^\+?(?:[ ()-]*\d){7,15}[ ()-]*$/'],
            'leader_whatsapp' => ['nullable', 'string', 'max:40', 'regex:/^\+?(?:[ ()-]*\d){7,15}[ ()-]*$/'],
            'display_color' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'expires_at'    => ['nullable', 'date'],
            'status'        => ['sometimes', Rule::enum(ReservationStatus::class)],
            'source'        => ['nullable', 'string', 'max:100'],
            'notes'         => ['nullable', 'string'],
            'total_price'   => ['nullable', 'numeric', 'min:0'],
            'assigned_to'   => ['nullable', 'exists:staff,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'leader_phone.regex' => 'El celular debe contener entre 7 y 15 dígitos; puedes incluir el indicativo del país.',
            'leader_whatsapp.regex' => 'El WhatsApp debe contener entre 7 y 15 dígitos; puedes incluir el indicativo del país.',
            'check_out.after'     => 'La fecha de salida debe ser posterior a la llegada.',
            'display_color.regex' => 'El color debe estar en formato hexadecimal, por ejemplo #0ea5e9.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $reservation = $this->route('reservation');

            if (! $reservation) {
                return;
            }

            $checkIn = $this->input('check_in', $reservation->check_in->format('Y-m-d'));
            $checkOut = $this->input('check_out', $reservation->check_out->format('Y-m-d'));

            if ($checkIn && $checkOut && $checkOut <= $checkIn) {
                $validator->errors()->add('check_out', 'La fecha de salida debe ser posterior a la llegada.');
            }
        });
    }
}
