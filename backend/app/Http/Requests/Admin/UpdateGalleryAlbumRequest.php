<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGalleryAlbumRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        $album = $this->route('gallery_album');

        return [
            'title'                 => ['sometimes', 'required', 'string', 'max:255'],
            'slug'                  => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('gallery_albums', 'slug')->ignore($album?->id),
            ],
            'description'           => ['nullable', 'string', 'max:1000'],
            'category'              => ['sometimes', Rule::enum(GalleryCategory::class)],
            'is_active'             => ['boolean'],
            'is_featured'           => ['boolean'],
            'sort_order'            => ['integer', 'min:0'],
            'cover_gallery_item_id' => ['nullable', 'integer', Rule::exists('gallery_items', 'id')],
        ];
    }
}
