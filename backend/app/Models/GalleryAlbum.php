<?php

namespace App\Models;

use App\Enums\GalleryCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GalleryAlbum extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'category',
        'is_active',
        'is_featured',
        'sort_order',
        'cover_gallery_item_id',
    ];

    protected function casts(): array
    {
        return [
            'category'    => GalleryCategory::class,
            'is_active'   => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(GalleryItem::class);
    }

    public function activeItems(): HasMany
    {
        return $this->items()->where('is_active', true);
    }

    public function images(): HasMany
    {
        return $this->items()->where('type', 'image');
    }

    public function videos(): HasMany
    {
        return $this->items()->where('type', 'video');
    }

    public function coverItem(): BelongsTo
    {
        return $this->belongsTo(GalleryItem::class, 'cover_gallery_item_id');
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
