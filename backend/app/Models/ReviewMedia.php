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
        'path',
        'alt',
        'mime_type',
        'size_bytes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }
}
