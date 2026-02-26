<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'message'       => ['required', 'string', 'max:2000'],
            'check_in'      => ['nullable', 'date', 'after_or_equal:today'],
            'check_out'     => ['nullable', 'date', 'after:check_in'],
            'guests_count'  => ['nullable', 'integer', 'min:1', 'max:20'],
            'cabin_type_id' => ['nullable', 'exists:cabin_types,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'            => 'El nombre es obligatorio.',
            'email.required'           => 'El correo electrónico es obligatorio.',
            'email.email'              => 'El correo electrónico no es válido.',
            'message.required'         => 'El mensaje es obligatorio.',
            'message.max'              => 'El mensaje no puede superar los 2000 caracteres.',
            'check_in.after_or_equal'  => 'La fecha de llegada debe ser hoy o posterior.',
            'check_out.after'          => 'La fecha de salida debe ser posterior a la llegada.',
            'cabin_type_id.exists'     => 'El tipo de cabaña no es válido.',
        ];
    }
}
