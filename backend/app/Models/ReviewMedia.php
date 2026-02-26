<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewMedia extends Model
{
    protected $table = 'review_media';

    protected $fillable = [
        'review_id',
        'url',
        'alt',
        'sort_order',
    ];

    // ── Relationships ──

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }
}
