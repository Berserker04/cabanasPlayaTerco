<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AvailabilityBlock extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'check_in',
        'check_out',
        'reason',
        'notes',
        'applies_to_all',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'check_in' => 'date',
            'check_out' => 'date',
            'applies_to_all' => 'boolean',
        ];
    }

    public function cabins(): BelongsToMany
    {
        return $this->belongsToMany(Cabin::class, 'availability_block_cabin')->withTrashed()
            ->withTimestamps();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeOverlapping(Builder $query, CarbonInterface|string $checkIn, CarbonInterface|string $checkOut): Builder
    {
        return $query
            ->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn);
    }
}
