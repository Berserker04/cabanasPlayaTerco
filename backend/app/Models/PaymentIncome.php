<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PaymentIncome extends Model
{
    protected $table = 'payments_income';

    protected $fillable = [
        'guest_group_id',
        'reservation_id',
        'amount',
        'method',
        'status',
        'reference',
        'payment_date',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'decimal:2',
            'method'       => PaymentMethod::class,
            'status'       => PaymentStatus::class,
            'payment_date' => 'date',
        ];
    }

    // ── Relationships ──

    public function guestGroup(): BelongsTo
    {
        return $this->belongsTo(GuestGroup::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
