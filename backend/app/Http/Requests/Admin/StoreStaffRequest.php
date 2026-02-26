<?php

namespace App\Http\Requests\Admin;

use App\Enums\StaffRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'full_name'       => ['required', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:50'],
            'phone'           => ['nullable', 'string', 'max:20'],
            'email'           => ['nullable', 'email', 'unique:staff,email'],
            'role'            => ['required', Rule::enum(StaffRole::class)],
            'is_active'       => ['boolean'],
            'hire_date'       => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'El nombre completo es obligatorio.',
            'role.required'      => 'El cargo es obligatorio.',
            'email.unique'       => 'Este correo ya está en uso.',
        ];
    }
}
