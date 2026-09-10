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
            'cabin_id' => ['nullable', \Illuminate\Validation\Rule::exists('cabins', 'id')->whereNull('deleted_at')],
            'cabin_ids' => ['required', 'array', 'min:1'],
            'cabin_ids.*' => ['integer', 'distinct', \Illuminate\Validation\Rule::exists('cabins', 'id')->whereNull('deleted_at')],
            'user_id' => ['nullable', 'exists:users,id'],
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests_count' => ['required', 'integer', 'min:1', 'max:'.config('booking.max_group_guests')],
            'leader_name' => ['nullable', 'string', 'max:255'],
            'leader_phone' => ['nullable', 'string', 'max:40', 'regex:/^\+?(?:[ ()-]*\d){7,15}[ ()-]*$/'],
            'leader_whatsapp' => ['nullable', 'string', 'max:40', 'regex:/^\+?(?:[ ()-]*\d){7,15}[ ()-]*$/'],
            'display_color' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'expires_at' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::enum(ReservationStatus::class)],
            'source' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'total_price' => ['nullable', 'numeric', 'min:0'],
            'assigned_to' => ['nullable', 'exists:staff,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'leader_phone.regex' => 'El celular debe contener entre 7 y 15 dígitos; puedes incluir el indicativo del país.',
            'leader_whatsapp.regex' => 'El WhatsApp debe contener entre 7 y 15 dígitos; puedes incluir el indicativo del país.',
            'cabin_ids.required' => 'Selecciona al menos una cabana.',
            'check_in.required' => 'La fecha de llegada es obligatoria.',
            'check_out.required' => 'La fecha de salida es obligatoria.',
            'check_out.after' => 'La fecha de salida debe ser posterior a la llegada.',
            'guests_count.required' => 'El numero de huespedes es obligatorio.',
            'guests_count.max' => 'El máximo permitido es de '.config('booking.max_group_guests').' huéspedes.',
            'display_color.regex' => 'El color debe estar en formato hexadecimal, por ejemplo #0ea5e9.',
        ];
    }
}
