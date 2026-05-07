<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'reservation_id',
        'guest_group_id',
        'author_name',
        'author_email',
        'rating',
        'title',
        'body',
        'admin_response',
        'status',
        'approved_at',
        'approved_by',
        'responded_at',
        'responded_by',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'status' => ReviewStatus::class,
            'approved_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function guestGroup(): BelongsTo
    {
        return $this->belongsTo(GuestGroup::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ReviewMedia::class);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', ReviewStatus::Approved);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', ReviewStatus::Pending);
    }
}
