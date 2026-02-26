<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CabinMedia extends Model
{
    protected $table = 'cabin_media';

    protected $fillable = [
        'cabin_type_id',
        'url',
        'alt',
        'type',
        'sort_order',
    ];

    // ── Relationships ──

    public function cabinType(): BelongsTo
    {
        return $this->belongsTo(CabinType::class);
    }
}
