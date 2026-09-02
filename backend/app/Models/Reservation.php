<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class Reservation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'cabin_id',
        'user_id',
        'check_in',
        'check_out',
        'guests_count',
        'leader_name',
        'display_color',
        'expires_at',
        'confirmed_at',
        'status',
        'source',
        'notes',
        'total_price',
        'created_by',
        'assigned_to',
    ];

    protected function casts(): array
    {
        return [
            'check_in'    => 'date',
            'check_out'   => 'date',
            'expires_at'   => 'datetime',
            'confirmed_at' => 'datetime',
            'status'      => ReservationStatus::class,
            'total_price' => 'decimal:2',
        ];
    }

    // ── Relationships ──

    public function cabin(): BelongsTo
    {
        return $this->belongsTo(Cabin::class);
    }

    public function cabins(): BelongsToMany
    {
        return $this->belongsToMany(Cabin::class, 'reservation_cabin')
            ->withTimestamps();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'assigned_to');
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
            ReservationStatus::Cancelled->value,
            ReservationStatus::NoShow->value,
            ReservationStatus::Expired->value,
        ]);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('check_in', '>=', today());
    }

    public function scopeOverlapping(Builder $query, mixed $checkIn, mixed $checkOut): Builder
    {
        return $query
            ->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn);
    }

    public function scopeBlockingAvailability(Builder $query): Builder
    {
        return $query->where(function (Builder $query): void {
            $query
                ->whereIn('status', [
                    ReservationStatus::Confirmed->value,
                    ReservationStatus::CheckedIn->value,
                ])
                ->orWhere(function (Builder $query): void {
                    $query
                        ->where('status', ReservationStatus::Pending->value)
                        ->whereNotNull('expires_at')
                        ->where('expires_at', '>', now());
                });
        });
    }

    public function scopeForCabins(Builder $query, Collection|array $cabinIds): Builder
    {
        $ids = collect($cabinIds)->map(fn ($id) => (int) $id)->unique()->values();

        return $query->where(function (Builder $query) use ($ids): void {
            $query
                ->whereIn('cabin_id', $ids)
                ->orWhereHas('cabins', fn (Builder $cabinQuery) => $cabinQuery->whereIn('cabins.id', $ids));
        });
    }

    public function isExpiredQuote(): bool
    {
        return $this->status === ReservationStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->lte(now());
    }

    public function isQuoteExpiringSoon(): bool
    {
        return $this->status === ReservationStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->isFuture()
            && $this->expires_at->lte(now()->addHours(12));
    }
}
