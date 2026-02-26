<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class GuestGroup extends Model
{
    protected $fillable = [
        'reservation_id',
        'titular_name',
        'titular_email',
        'titular_phone',
        'titular_document_number',
        'titular_document_type',
        'city_of_origin',
        'notes',
    ];

    // ── Relationships ──

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(GuestMember::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PaymentIncome::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
