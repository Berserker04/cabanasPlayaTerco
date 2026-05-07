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
            'cabin_id'   => ['required', 'exists:cabins,id'],
            'file'       => ['nullable', 'required_without:files', 'file', 'mimes:jpg,jpeg,png,webp,mp4,webm,mov', 'max:51200'],
            'files'      => ['nullable', 'required_without:file', 'array', 'max:20'],
            'files.*'    => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm,mov', 'max:51200'],
            'alt'        => ['nullable', 'string', 'max:255'],
            'type'       => ['nullable', 'string', 'in:image,video'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'cabin_id.required' => 'La cabaña es obligatoria.',
            'file.required_without' => 'Selecciona al menos un archivo.',
            'files.required_without' => 'Selecciona al menos un archivo.',
            'file.mimes'        => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'files.*.mimes'     => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'file.max'          => 'El archivo no puede superar los 50 MB.',
            'files.*.max'       => 'Cada archivo no puede superar los 50 MB.',
        ];
    }
}
