<?php

namespace App\Models;

use App\Enums\GalleryCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GalleryItem extends Model
{
    protected $fillable = [
        'url',
        'thumbnail_url',
        'alt',
        'caption',
        'category',
        'type',
        'sort_order',
        'is_featured',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'category'    => GalleryCategory::class,
            'is_featured' => 'boolean',
        ];
    }

    // ── Relationships ──

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ── Scopes ──

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }
}
