<?php

namespace App\Models;

use App\Enums\CabinStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cabin extends Model
{
    protected $fillable = [
        'cabin_type_id',
        'name',
        'slug',
        'code',
        'status',
        'floor',
        'notes',
        'cover_image',
        'cover_image_path',
        'short_description',
        'description',
        'guest_capacity',
        'min_guests',
        'max_guests',
        'beds_count',
        'bathrooms_count',
        'map_slot',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'status'          => CabinStatus::class,
            'is_active'       => 'boolean',
            'guest_capacity'  => 'integer',
            'min_guests'      => 'integer',
            'max_guests'      => 'integer',
            'beds_count'      => 'integer',
            'bathrooms_count' => 'integer',
            'sort_order'      => 'integer',
        ];
    }

    // ── Relationships ──

    public function type(): BelongsTo
    {
        return $this->belongsTo(CabinType::class, 'cabin_type_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(CabinMedia::class);
    }

    // ── Scopes ──

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', CabinStatus::Available);
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->whereNotNull('slug')
            ->where('status', '!=', CabinStatus::Inactive->value);
    }
}
