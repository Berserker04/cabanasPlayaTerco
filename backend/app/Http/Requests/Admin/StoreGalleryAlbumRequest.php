<?php

namespace App\Http\Requests\Admin;

use App\Enums\GalleryCategory;
use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreGalleryAlbumRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

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
            'cover_index'           => ['nullable', 'integer', 'min:0'],
            'files'                 => ['nullable', 'array', 'max:30'],
            'files.*'               => $this->mediaFileRule(),
            'file_captions'         => ['nullable', 'array'],
            'file_captions.*'       => ['nullable', 'string', 'max:500'],
            'file_alts'             => ['nullable', 'array'],
            'file_alts.*'           => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $files = $this->file('files', []);
            $files = is_array($files) ? $files : [];

            $this->validateMediaUploadSizes(
                $validator,
                collect($files)
                    ->mapWithKeys(fn ($file, int $index) => ["files.{$index}" => $file])
                    ->all(),
            );
        });
    }

    public function messages(): array
    {
        return [
            'files.max' => 'Puedes subir hasta 30 archivos por album.',
            'files.*.mimes' => 'Solo se permiten archivos JPG, PNG, WebP, MP4 o MOV.',
            'files.*.max' => 'Cada video no puede superar los 150 MB.',
        ];
    }
}
