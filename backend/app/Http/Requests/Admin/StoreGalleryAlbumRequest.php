<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGalleryAlbumRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'title'                 => ['required', 'string', 'max:255'],
            'slug'                  => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('gallery_albums', 'slug')],
            'description'           => ['nullable', 'string', 'max:1000'],
            'category'              => ['required', Rule::enum(GalleryCategory::class)],
            'is_active'             => ['boolean'],
            'is_featured'           => ['boolean'],
            'sort_order'            => ['integer', 'min:0'],
            'cover_gallery_item_id' => ['nullable', 'integer', Rule::exists('gallery_items', 'id')],
        ];
    }
}
