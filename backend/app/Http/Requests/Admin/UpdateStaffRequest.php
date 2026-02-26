<?php

namespace App\Http\Requests\Admin;

use App\Enums\StaffRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'full_name'       => ['sometimes', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:50'],
            'phone'           => ['nullable', 'string', 'max:20'],
            'email'           => ['nullable', 'email', Rule::unique('staff')->ignore($this->route('staff'))],
            'role'            => ['sometimes', Rule::enum(StaffRole::class)],
            'is_active'       => ['boolean'],
            'hire_date'       => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ];
    }
}
