<?php

namespace App\Models;

use App\Enums\StaffRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Staff extends Model
{
    protected $table = 'staff';

    protected $fillable = [
        'full_name',
        'document_number',
        'phone',
        'email',
        'role',
        'is_active',
        'hire_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'role'      => StaffRole::class,
            'is_active' => 'boolean',
            'hire_date' => 'date',
        ];
    }

    // ── Relationships ──

    public function payments(): HasMany
    {
        return $this->hasMany(StaffPayment::class);
    }

    // ── Scopes ──

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
