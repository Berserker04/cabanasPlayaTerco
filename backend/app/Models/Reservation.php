<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reservation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'cabin_id',
        'user_id',
        'check_in',
        'check_out',
        'guests_count',
        'status',
        'source',
        'notes',
        'total_price',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'check_in'    => 'date',
            'check_out'   => 'date',
            'status'      => ReservationStatus::class,
            'total_price' => 'decimal:2',
        ];
    }

    // ── Relationships ──

    public function cabin(): BelongsTo
    {
        return $this->belongsTo(Cabin::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function guestGroup(): HasOne
    {
        return $this->hasOne(GuestGroup::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PaymentIncome::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    // ── Scopes ──

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', [
            ReservationStatus::Cancelled,
            ReservationStatus::NoShow,
        ]);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('check_in', '>=', today());
    }
}
