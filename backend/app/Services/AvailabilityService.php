<?php

namespace App\Services;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\Cabin;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function checkAvailability(string $checkIn, string $checkOut, ?int $guests = null): Collection
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);

        $bookedCabinIds = Reservation::query()
            ->whereNotNull('cabin_id')
            ->whereNotIn('status', [
                ReservationStatus::Cancelled,
                ReservationStatus::NoShow,
            ])
            ->where(function ($query) use ($checkInDate, $checkOutDate) {
                $query->where('check_in', '<', $checkOutDate)
                    ->where('check_out', '>', $checkInDate);
            })
            ->pluck('cabin_id');

        $query = Cabin::query()
            ->with([
                'type.amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->where('status', CabinStatus::Available->value)
            ->where('is_active', true)
            ->whereNotNull('slug')
            ->whereNotIn('id', $bookedCabinIds);

        if ($guests) {
            $query->where('max_guests', '>=', $guests);
        }

        return $query->orderBy('name')->get();
    }

    public function getCalendar(string $month, ?int $cabinTypeId = null): array
    {
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $calendar = [];

        $cabinQuery = Cabin::query()
            ->where('status', CabinStatus::Available->value)
            ->where('is_active', true)
            ->whereNotNull('slug');
        if ($cabinTypeId) {
            $cabinQuery->where('cabin_type_id', $cabinTypeId);
        }

        $totalCabins = $cabinQuery->count();

        $reservations = Reservation::query()
            ->whereNotNull('cabin_id')
            ->whereNotIn('status', [
                ReservationStatus::Cancelled,
                ReservationStatus::NoShow,
            ])
            ->where('check_in', '<=', $end)
            ->where('check_out', '>', $start)
            ->when($cabinTypeId, fn ($query) => $query->whereHas('cabin', fn ($cabinQuery) => $cabinQuery->where('cabin_type_id', $cabinTypeId)))
            ->get(['cabin_id', 'check_in', 'check_out']);

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $bookedCount = $reservations
                ->filter(fn ($reservation) => $date->gte($reservation->check_in) && $date->lt($reservation->check_out))
                ->count();

            $available = max(0, $totalCabins - $bookedCount);

            $calendar[] = [
                'date'      => $date->format('Y-m-d'),
                'available' => $available,
                'total'     => $totalCabins,
                'status'    => $available === 0 ? 'full' : ($available <= 2 ? 'limited' : 'available'),
            ];
        }

        return $calendar;
    }
}
