<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CabinMapPoint extends Model
{
    protected $fillable = ['key', 'label', 'x', 'y', 'sort_order'];

    protected function casts(): array
    {
        return ['x' => 'float', 'y' => 'float', 'sort_order' => 'integer'];
    }

    public function cabin(): HasOne
    {
        return $this->hasOne(Cabin::class, 'map_slot', 'key')->withTrashed();
    }
}
