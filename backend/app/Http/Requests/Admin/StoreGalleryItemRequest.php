<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGalleryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'gallery_album_id' => ['required', 'integer', Rule::exists('gallery_albums', 'id')],
            'file'             => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov', 'max:20480'],
            'alt'              => ['nullable', 'string', 'max:255'],
            'caption'          => ['nullable', 'string', 'max:500'],
            'category'         => ['required', Rule::enum(GalleryCategory::class)],
            'sort_order'       => ['integer', 'min:0'],
            'is_featured'      => ['boolean'],
            'is_active'        => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'gallery_album_id.required' => 'El album es obligatorio.',
            'file.required'             => 'El archivo es obligatorio.',
            'file.mimes'                => 'Solo se permiten archivos JPG, PNG, WebP, MP4 o MOV.',
            'file.max'                  => 'El archivo no puede superar los 20 MB.',
            'category.required'         => 'La categoria es obligatoria.',
        ];
    }
}
