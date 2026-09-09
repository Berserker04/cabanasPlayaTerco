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
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\s().-]{7,30}$/'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'check_in' => ['nullable', 'required_with:check_out', 'date_format:Y-m-d', 'after_or_equal:'.now(config('app.business_timezone'))->toDateString()],
            'check_out' => ['nullable', 'required_with:check_in', 'date_format:Y-m-d', 'after:check_in'],
            'guests_count' => ['nullable', 'integer', 'min:1', 'max:50'],
            'cabin_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists('cabins', 'id')->where(fn ($query) => $query->whereNull('deleted_at')->where('is_active', true)->where('status', '!=', 'inactive'))],
            'cabin_type_id' => ['nullable', 'integer', 'exists:cabin_types,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
            'email.required' => 'El correo electronico es obligatorio.',
            'email.email' => 'El correo electronico no es valido.',
            'message.required' => 'El mensaje es obligatorio.',
            'message.min' => 'El mensaje debe tener al menos 10 caracteres.',
            'message.max' => 'El mensaje no puede superar los 2000 caracteres.',
            'phone.regex' => 'El telefono solo puede contener numeros, espacios y los simbolos + . ( ) -.',
            'check_in.required_with' => 'Indica tambien la fecha de llegada.',
            'check_in.after_or_equal' => 'La fecha de llegada debe ser hoy o posterior.',
            'check_out.required_with' => 'Indica tambien la fecha de salida.',
            'check_out.after' => 'La fecha de salida debe ser posterior a la llegada.',
            'guests_count.integer' => 'El numero de huespedes debe ser un numero entero.',
            'guests_count.min' => 'Debe haber al menos 1 huesped.',
            'guests_count.max' => 'El maximo permitido es de 50 huéspedes.',
            'cabin_id.exists' => 'La cabaña no es valida.',
            'cabin_type_id.exists' => 'El tipo de cabaña no es valido.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $fields = [
            'name',
            'email',
            'phone',
            'message',
            'check_in',
            'check_out',
            'guests_count',
            'cabin_id',
            'cabin_type_id',
        ];

        $normalized = [];

        foreach ($fields as $field) {
            if (! $this->has($field)) {
                continue;
            }

            $value = $this->input($field);

            if (is_string($value)) {
                $value = trim($value);
            }

            $normalized[$field] = $value === '' ? null : $value;
        }

        if (isset($normalized['email']) && is_string($normalized['email'])) {
            $normalized['email'] = mb_strtolower($normalized['email']);
        }

        $this->merge($normalized);
    }
}
