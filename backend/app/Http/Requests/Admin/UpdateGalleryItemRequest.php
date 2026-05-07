<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGalleryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'gallery_album_id' => ['sometimes', 'nullable', 'integer', Rule::exists('gallery_albums', 'id')],
            'alt'              => ['nullable', 'string', 'max:255'],
            'caption'          => ['nullable', 'string', 'max:500'],
            'category'         => ['sometimes', Rule::enum(GalleryCategory::class)],
            'sort_order'       => ['integer', 'min:0'],
            'is_featured'      => ['boolean'],
            'is_active'        => ['boolean'],
        ];
    }
}
