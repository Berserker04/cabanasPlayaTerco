<?php

namespace App\Services;

use App\Models\AvailabilityBlock;
use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\Cabin;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function checkAvailability(string $checkIn, string $checkOut, ?int $guests = null, bool $admin = false): array
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);

        $cabins = Cabin::query()
            ->with([
                'type.amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->whereNotNull('map_slot')
            ->when(! $admin, fn ($query) => $query->whereNotNull('slug'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $reservations = Reservation::query()
            ->with(['cabins:id,name', 'cabin:id,name', 'guestGroup'])
            ->active()
            ->where('check_in', '<', $checkOutDate)
            ->where('check_out', '>', $checkInDate)
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id,name')
            ->overlapping($checkInDate, $checkOutDate)
            ->get();

        $reservationsByCabin = $this->reservationsByCabin($reservations);
        $blocksByCabin = $this->blocksByCabin($blocks, $cabins->pluck('id'));

        $entries = $cabins
            ->map(fn (Cabin $cabin) => $this->buildEntry(
                cabin: $cabin,
                reservation: $reservationsByCabin->get($cabin->id),
                block: $blocksByCabin->get($cabin->id),
                guests: $guests,
                admin: $admin,
            ))
            ->values();

        $available = $entries
            ->filter(fn (array $entry) => $entry['is_available'])
            ->values();

        $summary = [
            'total_cabins'       => $entries->count(),
            'available_count'    => $available->count(),
            'reserved_count'     => $entries->where('state', 'reserved')->count(),
            'blocked_count'      => $entries->whereIn('state', ['blocked', 'maintenance'])->count(),
            'inactive_count'     => $entries->where('state', 'inactive')->count(),
            'available_capacity' => $available->sum(fn (array $entry) => $entry['cabin']->max_guests ?? 0),
            'can_host_guests'    => $guests ? $available->sum(fn (array $entry) => $entry['cabin']->max_guests ?? 0) >= $guests : $available->isNotEmpty(),
        ];

        return [
            'check_in'         => $checkInDate->format('Y-m-d'),
            'check_out'        => $checkOutDate->format('Y-m-d'),
            'guests'           => $guests,
            'cabins'           => $entries,
            'available_cabins' => $available,
            'summary'          => $summary,
            'message'          => $this->availabilityMessage($summary),
        ];
    }

    public function getCalendar(string $month, ?int $cabinTypeId = null): array
    {
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $endExclusive = $end->copy()->addDay();
        $calendar = [];

        $cabinQuery = Cabin::query()
            ->where('status', CabinStatus::Available->value)
            ->where('is_active', true)
            ->whereNotNull('slug');
        if ($cabinTypeId) {
            $cabinQuery->where('cabin_type_id', $cabinTypeId);
        }

        $cabinIds = $cabinQuery->pluck('id');
        $totalCabins = $cabinIds->count();

        $reservations = Reservation::query()
            ->with('cabins:id')
            ->active()
            ->where('check_in', '<', $endExclusive)
            ->where('check_out', '>', $start)
            ->when($cabinTypeId, fn ($query) => $query->whereHas('cabin', fn ($cabinQuery) => $cabinQuery->where('cabin_type_id', $cabinTypeId)))
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id')
            ->overlapping($start, $endExclusive)
            ->get();

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $unavailableCabinIds = collect();

            foreach ($reservations as $reservation) {
                if ($date->gte($reservation->check_in) && $date->lt($reservation->check_out)) {
                    $unavailableCabinIds = $unavailableCabinIds->merge($this->reservationCabinIds($reservation));
                }
            }

            foreach ($blocks as $block) {
                if (! ($date->gte($block->check_in) && $date->lt($block->check_out))) {
                    continue;
                }

                $unavailableCabinIds = $block->applies_to_all
                    ? $unavailableCabinIds->merge($cabinIds)
                    : $unavailableCabinIds->merge($block->cabins->pluck('id'));
            }

            $bookedCount = $unavailableCabinIds
                ->intersect($cabinIds)
                ->unique()
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

    public function unavailableCabinIdsForRange(
        string $checkIn,
        string $checkOut,
        array $cabinIds,
        ?int $ignoreReservationId = null,
        ?int $ignoreBlockId = null,
        bool $includeCabinStatus = true,
    ): Collection {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        $cabinIds = collect($cabinIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();

        if ($cabinIds->isEmpty()) {
            return collect();
        }

        $unavailable = $includeCabinStatus
            ? Cabin::query()
                ->whereIn('id', $cabinIds)
                ->where(function ($query) {
                    $query->where('is_active', false)
                        ->orWhere('status', '!=', CabinStatus::Available->value);
                })
                ->pluck('id')
            : collect();

        $reservations = Reservation::query()
            ->with('cabins:id')
            ->active()
            ->when($ignoreReservationId, fn ($query) => $query->whereKeyNot($ignoreReservationId))
            ->where('check_in', '<', $checkOutDate)
            ->where('check_out', '>', $checkInDate)
            ->where(function ($query) use ($cabinIds) {
                $query->whereIn('cabin_id', $cabinIds)
                    ->orWhereHas('cabins', fn ($cabinQuery) => $cabinQuery->whereIn('cabins.id', $cabinIds));
            })
            ->get();

        foreach ($reservations as $reservation) {
            $unavailable = $unavailable->merge($this->reservationCabinIds($reservation));
        }

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id')
            ->when($ignoreBlockId, fn ($query) => $query->whereKeyNot($ignoreBlockId))
            ->overlapping($checkInDate, $checkOutDate)
            ->where(function ($query) use ($cabinIds) {
                $query->where('applies_to_all', true)
                    ->orWhereHas('cabins', fn ($cabinQuery) => $cabinQuery->whereIn('cabins.id', $cabinIds));
            })
            ->get();

        foreach ($blocks as $block) {
            $unavailable = $block->applies_to_all
                ? $unavailable->merge($cabinIds)
                : $unavailable->merge($block->cabins->pluck('id'));
        }

        return $unavailable
            ->intersect($cabinIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }

    private function reservationsByCabin(Collection $reservations): Collection
    {
        $mapped = collect();

        foreach ($reservations as $reservation) {
            foreach ($this->reservationCabinIds($reservation) as $cabinId) {
                $mapped->put((int) $cabinId, $reservation);
            }
        }

        return $mapped;
    }

    private function reservationCabinIds(Reservation $reservation): Collection
    {
        $ids = $reservation->relationLoaded('cabins')
            ? $reservation->cabins->pluck('id')
            : collect();

        if ($ids->isEmpty() && $reservation->cabin_id) {
            $ids->push($reservation->cabin_id);
        }

        return $ids->map(fn ($id) => (int) $id)->unique()->values();
    }

    private function blocksByCabin(Collection $blocks, Collection $allCabinIds): Collection
    {
        $mapped = collect();

        foreach ($blocks as $block) {
            $targetIds = $block->applies_to_all
                ? $allCabinIds
                : $block->cabins->pluck('id');

            foreach ($targetIds as $cabinId) {
                $mapped->put((int) $cabinId, $block);
            }
        }

        return $mapped;
    }

    private function buildEntry(
        Cabin $cabin,
        ?Reservation $reservation,
        ?AvailabilityBlock $block,
        ?int $guests,
        bool $admin,
    ): array {
        $fitsGuests = ! $guests || $cabin->max_guests >= $guests;

        if ($cabin->status === CabinStatus::Maintenance || $block) {
            $state = $cabin->status === CabinStatus::Maintenance ? 'maintenance' : 'blocked';
            $tone = 'orange';
            $label = $admin ? ($block?->reason ?? 'Mantenimiento') : 'No disponible';
            $isAvailable = false;
        } elseif ($reservation) {
            $state = 'reserved';
            $tone = 'red';
            $label = $admin ? $this->reservationLabel($reservation) : 'No disponible';
            $isAvailable = false;
        } elseif (! $cabin->is_active || $cabin->status === CabinStatus::Inactive) {
            $state = 'inactive';
            $tone = 'gray';
            $label = $admin ? 'Inactiva' : 'No disponible';
            $isAvailable = false;
        } else {
            $state = 'available';
            $tone = 'green';
            $label = 'Disponible';
            $isAvailable = true;
        }

        return [
            'cabin_id'      => $cabin->id,
            'map_slot'      => $cabin->map_slot,
            'state'         => $state,
            'tone'          => $tone,
            'label'         => $label,
            'is_available'  => $isAvailable,
            'fits_guests'   => $fitsGuests,
            'leader_name'   => $admin ? $reservation?->leader_name : null,
            'display_color' => $admin ? $reservation?->display_color : null,
            'reservation'   => $admin && $reservation ? [
                'id'            => $reservation->id,
                'status'        => $reservation->status->value,
                'status_label'  => $reservation->status->label(),
                'leader_name'   => $reservation->leader_name,
                'display_color' => $reservation->display_color,
                'check_in'      => $reservation->check_in->format('Y-m-d'),
                'check_out'     => $reservation->check_out->format('Y-m-d'),
                'guests_count'  => $reservation->guests_count,
            ] : null,
            'block'         => $block ? [
                'id'             => $block->id,
                'reason'         => $admin ? $block->reason : 'No disponible',
                'notes'          => $admin ? $block->notes : null,
                'applies_to_all' => $block->applies_to_all,
            ] : null,
            'cabin'         => $cabin,
        ];
    }

    private function reservationLabel(Reservation $reservation): string
    {
        if ($reservation->status === ReservationStatus::Pending) {
            return $reservation->leader_name ? "Cotizada: {$reservation->leader_name}" : 'Cotizada';
        }

        return $reservation->leader_name ? "Reservada: {$reservation->leader_name}" : 'Reservada';
    }

    private function availabilityMessage(array $summary): string
    {
        if ($summary['available_count'] > 0) {
            return "Hay {$summary['available_count']} cabanas disponibles para estas fechas. La confirmacion final la hace el administrador.";
        }

        return 'No aparecen cabanas disponibles para estas fechas. Igual escribenos: la ultima opinion la tiene el administrador.';
    }
}
