<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LodgingTariff extends Model
{
    protected $fillable = [
        'title',
        'price_cop',
        'unit_label',
        'description',
        'includes',
        'excludes',
        'public_notes',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_cop'  => 'decimal:2',
            'includes'   => 'array',
            'excludes'   => 'array',
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
