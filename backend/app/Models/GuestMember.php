<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuestMember extends Model
{
    protected $fillable = [
        'guest_group_id',
        'full_name',
        'document_number',
        'document_type',
        'age',
        'is_minor',
    ];

    protected function casts(): array
    {
        return [
            'is_minor' => 'boolean',
        ];
    }

    // ── Relationships ──

    public function group(): BelongsTo
    {
        return $this->belongsTo(GuestGroup::class, 'guest_group_id');
    }
}
