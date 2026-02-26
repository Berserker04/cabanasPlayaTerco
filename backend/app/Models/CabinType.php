<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CabinType extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'short_description',
        'base_price',
        'max_guests',
        'bedrooms',
        'bathrooms',
        'size_sqm',
        'image',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'size_sqm'   => 'decimal:2',
            'is_active'  => 'boolean',
        ];
    }

    // ── Relationships ──

    public function cabins(): HasMany
    {
        return $this->hasMany(Cabin::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'cabin_type_amenity');
    }

    public function media(): HasMany
    {
        return $this->hasMany(CabinMedia::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    // ── Scopes ──

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
