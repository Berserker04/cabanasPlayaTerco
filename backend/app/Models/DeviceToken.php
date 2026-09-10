<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\PersonalAccessToken;

class DeviceToken extends Model
{
    protected $fillable = [
        'user_id',
        'personal_access_token_id',
        'token',
        'platform',
        'device_name',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(PersonalAccessToken::class, 'personal_access_token_id');
    }

    public function scopeEligibleRecipient(Builder $query): Builder
    {
        return $query->whereHas('user', fn (Builder $user) => $user
            ->where('status', 'active')
            ->whereHas('roles', fn (Builder $roles) => $roles->whereIn('name', ['admin', 'staff'])))
            ->whereHas('session', fn (Builder $session) => $session
                ->whereColumn('personal_access_tokens.tokenable_id', 'device_tokens.user_id')
                ->where('tokenable_type', (new User)->getMorphClass())
                ->when(config('sanctum.expiration'), fn (Builder $q, $minutes) => $q->where('personal_access_tokens.created_at', '>', now()->subMinutes($minutes)))
                ->where(fn (Builder $expiry) => $expiry->whereNull('expires_at')->orWhere('expires_at', '>', now())));
    }
}
