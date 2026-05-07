<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreGalleryItemRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'gallery_album_id' => ['nullable', 'integer', Rule::exists('gallery_albums', 'id')],
            'file'             => ['required', ...$this->mediaFileRule()],
            'alt'              => ['nullable', 'string', 'max:255'],
            'caption'          => ['nullable', 'string', 'max:500'],
            'category'         => ['required', Rule::enum(GalleryCategory::class)],
            'sort_order'       => ['integer', 'min:0'],
            'is_featured'      => ['boolean'],
            'is_active'        => ['boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $validator) => $this->validateMediaUploadSizes($validator, [
            'file' => $this->file('file'),
        ]));
    }

    public function messages(): array
    {
        return [
            'file.required'     => 'El archivo es obligatorio.',
            'file.mimes'        => 'Solo se permiten archivos JPG, PNG, WebP, MP4 o MOV.',
            'file.max'          => 'Cada video no puede superar los 150 MB.',
            'category.required' => 'La categoria es obligatoria.',
        ];
    }
}
