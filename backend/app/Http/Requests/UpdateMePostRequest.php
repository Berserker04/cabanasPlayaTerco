<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'summary' => ['nullable', 'string', 'max:1200'],
            'body' => ['sometimes', 'string', 'min:20'],
            'featured_image' => ['nullable', 'string', 'max:2048'],
            'cover_media_id' => ['nullable', 'integer', 'exists:post_media,id'],
            'visit_date' => ['nullable', 'date', 'before_or_equal:today'],
            'travel_style' => ['nullable', 'string', 'max:80'],
            'media_ids' => ['nullable', 'array', 'max:20'],
            'media_ids.*' => ['integer', 'distinct', 'exists:post_media,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'tag_names' => ['nullable', 'array', 'max:12'],
            'tag_names.*' => ['string', 'max:40'],
        ];
    }
}
