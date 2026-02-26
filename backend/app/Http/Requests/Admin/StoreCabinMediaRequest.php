<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCabinMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_type_id' => ['required', 'exists:cabin_types,id'],
            'file'          => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'alt'           => ['nullable', 'string', 'max:255'],
            'type'          => ['nullable', 'string', 'in:image,video'],
            'sort_order'    => ['integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'cabin_type_id.required' => 'El tipo de cabaña es obligatorio.',
            'file.required'          => 'El archivo es obligatorio.',
            'file.mimes'             => 'Solo se permiten archivos JPG, PNG o WebP.',
            'file.max'               => 'El archivo no puede superar los 10 MB.',
        ];
    }
}
