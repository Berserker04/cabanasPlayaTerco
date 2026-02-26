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
        'code',
        'status',
        'floor',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => CabinStatus::class,
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

    // ── Scopes ──

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', CabinStatus::Available);
    }
}
