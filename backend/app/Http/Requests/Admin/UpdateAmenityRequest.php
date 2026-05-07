<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmenityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name'     => ['sometimes', 'string', 'max:255', Rule::unique('amenities')->ignore($this->route('amenity'))],
            'icon'     => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'Esta amenidad ya existe.',
        ];
    }
}
