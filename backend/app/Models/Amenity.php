<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Amenity extends Model
{
    protected $fillable = [
        'name',
        'icon',
        'category',
    ];

    // ── Relationships ──

    public function cabinTypes(): BelongsToMany
    {
        return $this->belongsToMany(CabinType::class, 'cabin_type_amenity');
    }
}
