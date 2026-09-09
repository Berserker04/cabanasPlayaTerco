<?php

namespace App\Http\Requests\Concerns;

use App\Enums\PostStatus;
use App\Enums\PostType;
use Illuminate\Validation\Rule;

trait ValidatesPost
{
    protected function postRules(bool $creating, bool $admin = false): array
    {
        $rules = [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:500000'],
            'status' => ['sometimes', Rule::enum(PostStatus::class)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'summary' => ['nullable', 'string', 'max:1200'],
            'featured_image' => ['nullable', 'url:http,https', 'max:2048'],
            'visit_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'travel_style' => ['nullable', 'string', 'max:80'],
            'cover_media_id' => ['nullable', 'integer', 'exists:post_media,id'],
            'media_ids' => ['sometimes', 'array', 'max:20'],
            'media_ids.*' => ['integer', 'distinct', 'exists:post_media,id'],
            'media_alt' => ['sometimes', 'array', 'max:20'],
            'media_alt.*' => ['nullable', 'string', 'max:255'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'tag_names' => ['nullable', 'array', 'max:12'],
            'tag_names.*' => ['string', 'max:40'],
        ];
        if ($admin) {
            $rules += [
                'type' => ['sometimes', Rule::enum(PostType::class)],
                'slug' => ['sometimes', 'string', 'max:255'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string', 'max:500'],
            ];
        }

        return $rules;
    }
}
