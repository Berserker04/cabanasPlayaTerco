<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'La contrasena actual es obligatoria.',
            'current_password.current_password' => 'La contrasena actual no es correcta.',
            'password.required' => 'La nueva contrasena es obligatoria.',
            'password.confirmed' => 'Las contrasenas no coinciden.',
        ];
    }
}
