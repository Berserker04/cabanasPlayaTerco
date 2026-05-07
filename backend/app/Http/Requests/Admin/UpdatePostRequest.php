<?php

namespace App\Http\Requests\Admin;

use App\Enums\PostStatus;
use App\Enums\PostType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'title'            => ['sometimes', 'string', 'max:255'],
            'slug'             => ['sometimes', 'string', 'max:255', Rule::unique('posts')->ignore($this->route('post'))],
            'excerpt'          => ['nullable', 'string', 'max:500'],
            'summary'          => ['nullable', 'string', 'max:1200'],
            'body'             => ['sometimes', 'string'],
            'featured_image'   => ['nullable', 'string'],
            'cover_image_path'  => ['nullable', 'string'],
            'type'             => ['sometimes', Rule::enum(PostType::class)],
            'status'           => ['sometimes', Rule::enum(PostStatus::class)],
            'published_at'     => ['nullable', 'date'],
            'visit_date'       => ['nullable', 'date'],
            'travel_style'     => ['nullable', 'string', 'max:80'],
            'meta_title'       => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'cover_media_id'   => ['nullable', 'integer', 'exists:post_media,id'],
            'media_ids'        => ['nullable', 'array', 'max:20'],
            'media_ids.*'      => ['integer', 'distinct', 'exists:post_media,id'],
            'category_ids'     => ['nullable', 'array'],
            'category_ids.*'   => ['exists:categories,id'],
            'tag_ids'          => ['nullable', 'array'],
            'tag_ids.*'        => ['exists:tags,id'],
            'tag_names'        => ['nullable', 'array', 'max:12'],
            'tag_names.*'      => ['string', 'max:40'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.unique' => 'Este slug ya está en uso.',
        ];
    }
}
