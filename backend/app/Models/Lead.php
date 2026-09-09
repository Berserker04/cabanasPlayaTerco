<?php

namespace App\Models;

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'source',
        'status',
        'message',
        'check_in',
        'check_out',
        'guests_count',
        'cabin_id',
        'cabin_type_id',
        'assigned_to',
        'notes',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'source' => LeadSource::class,
            'status' => LeadStatus::class,
            'check_in' => 'date',
            'check_out' => 'date',
            'responded_at' => 'datetime',
        ];
    }

    // ── Relationships ──

    public function cabinType(): BelongsTo
    {
        return $this->belongsTo(CabinType::class);
    }

    public function cabin(): BelongsTo
    {
        return $this->belongsTo(Cabin::class)->withTrashed();
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // ── Scopes ──

    public function scopeNew(Builder $query): Builder
    {
        return $query->where('status', LeadStatus::New);
    }

    public function scopeUnresponded(Builder $query): Builder
    {
        return $query->whereNull('responded_at');
    }
}
