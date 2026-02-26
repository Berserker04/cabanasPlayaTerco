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
    /**
     * Check available cabins for a date range and guest count.
     */
    public function checkAvailability(string $checkIn, string $checkOut, ?int $guests = null): Collection
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);

        $bookedCabinIds = Reservation::query()
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
            ->with('type.amenities')
            ->where('status', CabinStatus::Available)
            ->whereNotIn('id', $bookedCabinIds);

        if ($guests) {
            $query->whereHas('type', fn ($q) => $q->where('max_guests', '>=', $guests));
        }

        return $query->get();
    }

    /**
     * Get calendar availability for a specific month and optional cabin type.
     */
    public function getCalendar(string $month, ?int $cabinTypeId = null): array
    {
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $calendar = [];

        $cabinQuery = Cabin::query()->where('status', CabinStatus::Available);
        if ($cabinTypeId) {
            $cabinQuery->where('cabin_type_id', $cabinTypeId);
        }
        $totalCabins = $cabinQuery->count();

        $reservations = Reservation::query()
            ->whereNotIn('status', [
                ReservationStatus::Cancelled,
                ReservationStatus::NoShow,
            ])
            ->where('check_in', '<=', $end)
            ->where('check_out', '>=', $start)
            ->when($cabinTypeId, fn ($q) => $q->whereHas('cabin', fn ($cq) => $cq->where('cabin_type_id', $cabinTypeId)))
            ->get(['cabin_id', 'check_in', 'check_out']);

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $bookedCount = $reservations->filter(function ($r) use ($date) {
                return $date->between($r->check_in, $r->check_out->subDay());
            })->count();

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
