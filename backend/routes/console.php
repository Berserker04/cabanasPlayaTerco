<?php

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('reservations:expire-pending', function (): int {
    $expired = Reservation::query()
        ->where('status', ReservationStatus::Pending->value)
        ->whereNotNull('expires_at')
        ->where('expires_at', '<=', now())
        ->update(['status' => ReservationStatus::Expired->value]);

    $this->info("Cotizaciones vencidas: {$expired}");

    return self::SUCCESS;
})->purpose('Mark expired pending reservation quotes as expired');

Schedule::command('reservations:expire-pending')->hourly();
