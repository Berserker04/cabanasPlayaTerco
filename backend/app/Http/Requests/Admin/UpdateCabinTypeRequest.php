<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCabinTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name'              => ['sometimes', 'string', 'max:255'],
            'slug'              => ['sometimes', 'string', 'max:255', Rule::unique('cabin_types')->ignore($this->route('cabinType'))],
            'description'       => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'base_price'        => ['sometimes', 'numeric', 'min:0'],
            'max_guests'        => ['sometimes', 'integer', 'min:1'],
            'bedrooms'          => ['sometimes', 'integer', 'min:0'],
            'bathrooms'         => ['sometimes', 'integer', 'min:0'],
            'size_sqm'          => ['nullable', 'numeric', 'min:0'],
            'image'             => ['nullable', 'string'],
            'is_active'         => ['boolean'],
            'sort_order'        => ['integer', 'min:0'],
            'amenity_ids'       => ['nullable', 'array'],
            'amenity_ids.*'     => ['exists:amenities,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.unique' => 'Este slug ya está en uso.',
        ];
    }
}
