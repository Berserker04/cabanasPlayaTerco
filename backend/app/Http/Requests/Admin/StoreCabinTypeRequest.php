<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCabinTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:255'],
            'slug'              => ['required', 'string', 'max:255', 'unique:cabin_types,slug'],
            'description'       => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'base_price'        => ['required', 'numeric', 'min:0'],
            'max_guests'        => ['required', 'integer', 'min:1'],
            'bedrooms'          => ['required', 'integer', 'min:0'],
            'bathrooms'         => ['required', 'integer', 'min:0'],
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
            'name.required'       => 'El nombre es obligatorio.',
            'slug.required'       => 'El slug es obligatorio.',
            'slug.unique'         => 'Este slug ya está en uso.',
            'base_price.required' => 'El precio base es obligatorio.',
            'max_guests.required' => 'La capacidad máxima es obligatoria.',
        ];
    }
}
