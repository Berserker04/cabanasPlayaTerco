<?php

namespace App\Models;

use App\Enums\GalleryCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GalleryItem extends Model
{
    protected $fillable = [
        'gallery_album_id',
        'url',
        'path',
        'thumbnail_url',
        'thumbnail_path',
        'alt',
        'caption',
        'category',
        'type',
        'mime_type',
        'size_bytes',
        'sort_order',
        'is_featured',
        'is_active',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'category'    => GalleryCategory::class,
            'size_bytes'  => 'integer',
            'is_featured' => 'boolean',
            'is_active'   => 'boolean',
        ];
    }

    public function album(): BelongsTo
    {
        return $this->belongsTo(GalleryAlbum::class, 'gallery_album_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }
}
