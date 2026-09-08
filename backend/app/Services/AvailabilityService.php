<?php

namespace App\Services;

use App\Enums\CabinStatus;
use App\Enums\ReservationStatus;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function checkAvailability(string $checkIn, string $checkOut, ?int $guests = null, bool $admin = false): array
    {
        $checkInDate = Carbon::parse($checkIn)->startOfDay();
        $checkOutDate = Carbon::parse($checkOut)->startOfDay();
        $cabins = $this->cabinsForAvailability($admin);

        $reservations = Reservation::query()
            ->with(['cabins:id,name,map_slot', 'cabin:id,name,map_slot', 'guestGroup'])
            ->blockingAvailability()
            ->overlapping($checkInDate, $checkOutDate)
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id,name,map_slot')
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
            'total_cabins' => $entries->count(),
            'available_count' => $available->count(),
            'reserved_count' => $entries->where('state', 'reserved')->count(),
            'quoted_count' => $entries
                ->filter(fn (array $entry) => ($entry['reservation']['status'] ?? null) === ReservationStatus::Pending->value)
                ->count(),
            'confirmed_count' => $entries
                ->filter(fn (array $entry) => in_array($entry['reservation']['status'] ?? null, [
                    ReservationStatus::Confirmed->value,
                    ReservationStatus::CheckedIn->value,
                ], true))
                ->count(),
            'blocked_count' => $entries->whereIn('state', ['blocked', 'maintenance'])->count(),
            'inactive_count' => $entries->where('state', 'inactive')->count(),
            'available_capacity' => $available->sum(fn (array $entry) => $entry['cabin']->max_guests ?? 0),
            'can_host_guests' => $guests
                ? $available->sum(fn (array $entry) => $entry['cabin']->max_guests ?? 0) >= $guests
                : $available->isNotEmpty(),
        ];

        return [
            'check_in' => $checkInDate->format('Y-m-d'),
            'check_out' => $checkOutDate->format('Y-m-d'),
            'guests' => $guests,
            'cabins' => $entries,
            'available_cabins' => $available,
            'summary' => $summary,
            'message' => $this->availabilityMessage($summary),
        ];
    }

    public function getCalendar(string $month, ?int $cabinTypeId = null): array
    {
        $start = Carbon::parse($month.'-01')->startOfMonth();
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
            ->blockingAvailability()
            ->overlapping($start, $endExclusive)
            ->when($cabinTypeId, function ($query) use ($cabinTypeId): void {
                $query->where(function ($query) use ($cabinTypeId): void {
                    $query
                        ->whereHas('cabin', fn ($cabinQuery) => $cabinQuery->where('cabin_type_id', $cabinTypeId))
                        ->orWhereHas('cabins', fn ($cabinQuery) => $cabinQuery->where('cabin_type_id', $cabinTypeId));
                });
            })
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id')
            ->overlapping($start, $endExclusive)
            ->get();

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $unavailableCabinIds = $this->unavailableCabinIdsForDay($date, $reservations, $blocks, $cabinIds);
            $bookedCount = $unavailableCabinIds
                ->intersect($cabinIds)
                ->unique()
                ->count();
            $available = max(0, $totalCabins - $bookedCount);

            $calendar[] = [
                'date' => $date->format('Y-m-d'),
                'available' => $available,
                'total' => $totalCabins,
                'status' => $available === 0 ? 'full' : ($available <= 2 ? 'limited' : 'available'),
            ];
        }

        return $calendar;
    }

    public function getPlanner(string $checkIn, string $checkOut, ?int $guests = null, ?int $excludeReservationId = null): array
    {
        $checkInDate = Carbon::parse($checkIn)->startOfDay();
        $checkOutDate = Carbon::parse($checkOut)->startOfDay();

        $cabins = Cabin::query()
            ->with([
                'type',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->whereNotNull('map_slot')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $reservations = Reservation::query()
            ->with(['cabins:id,name', 'cabin:id,name', 'guestGroup', 'assignedStaff'])
            ->when($excludeReservationId, fn ($query) => $query->whereKeyNot($excludeReservationId))
            ->blockingAvailability()
            ->overlapping($checkInDate, $checkOutDate)
            ->get();

        $quotes = Reservation::query()
            ->with(['cabins:id,name', 'cabin:id,name', 'guestGroup', 'assignedStaff'])
            ->when($excludeReservationId, fn ($query) => $query->whereKeyNot($excludeReservationId))
            ->where('status', ReservationStatus::Pending->value)
            ->where(function ($query): void {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->overlapping($checkInDate, $checkOutDate)
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id,name')
            ->overlapping($checkInDate, $checkOutDate)
            ->get();

        $plannerCabins = $cabins
            ->map(fn (Cabin $cabin) => $this->buildPlannerCabin(
                cabin: $cabin,
                reservations: $reservations,
                quotes: $quotes,
                blocks: $blocks,
                checkInDate: $checkInDate,
                checkOutDate: $checkOutDate,
                guests: $guests,
            ))
            ->values();

        $availableForRange = $plannerCabins
            ->filter(fn (array $entry) => $entry['available_for_range'])
            ->values();

        $summary = [
            'total_cabins' => $plannerCabins->count(),
            'available_count' => $availableForRange->count(),
            'quoted_count' => $plannerCabins
                ->filter(fn (array $entry) => collect($entry['segments'])
                    ->contains(fn (array $segment) => count($segment['quotes']) > 0))
                ->count(),
            'reserved_count' => $plannerCabins->filter(fn (array $entry) => $this->hasPlannerState($entry, 'reserved'))->count(),
            'blocked_count' => $plannerCabins->filter(fn (array $entry) => $this->hasPlannerState($entry, 'blocked'))->count(),
            'maintenance_count' => $plannerCabins->filter(fn (array $entry) => $this->hasPlannerState($entry, 'maintenance'))->count(),
            'inactive_count' => $plannerCabins->filter(fn (array $entry) => $this->hasPlannerState($entry, 'inactive'))->count(),
            'available_capacity' => $availableForRange->sum('max_guests'),
            'can_host_guests' => $guests
                ? $availableForRange->sum('max_guests') >= $guests
                : $availableForRange->isNotEmpty(),
        ];

        return [
            'check_in' => $checkInDate->format('Y-m-d'),
            'check_out' => $checkOutDate->format('Y-m-d'),
            'guests' => $guests,
            'cabins' => $plannerCabins,
            'suggestions' => $this->buildCabinSuggestions($availableForRange, $guests),
            'summary' => $summary,
        ];
    }

    public function getAdminAgenda(string $from, string $to): array
    {
        $start = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->startOfDay();

        $stays = Reservation::query()
            ->with(['cabins:id,name', 'cabin:id,name', 'assignedStaff'])
            ->whereIn('status', [
                ReservationStatus::Confirmed->value,
                ReservationStatus::CheckedIn->value,
                ReservationStatus::CheckedOut->value,
            ])
            ->where('check_in', '<=', $end)
            ->where('check_out', '>=', $start)
            ->orderBy('check_in')
            ->orderBy('id')
            ->get();

        $quotes = Reservation::query()
            ->with(['cabins:id,name', 'cabin:id,name', 'assignedStaff'])
            ->where('status', ReservationStatus::Pending->value)
            ->where(function ($query): void {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->overlapping($start, $end)
            ->orderBy('check_in')
            ->orderBy('id')
            ->get();

        $reservations = $stays
            ->concat($quotes)
            ->unique('id')
            ->sortBy([
                ['check_in', 'asc'],
                ['id', 'asc'],
            ])
            ->values();

        $cabins = Cabin::query()
            ->select(['id', 'name'])
            ->whereNotNull('map_slot')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id,name')
            ->overlapping($start, $end)
            ->orderBy('check_in')
            ->orderBy('id')
            ->get();

        $arrivals = $stays->filter(
            fn (Reservation $reservation): bool => $reservation->check_in->gte($start)
                && $reservation->check_in->lte($end)
        );
        $departures = $stays->filter(
            fn (Reservation $reservation): bool => $reservation->check_out->gte($start)
                && $reservation->check_out->lte($end)
        );

        return [
            'period' => [
                'from' => $start->format('Y-m-d'),
                'to' => $end->format('Y-m-d'),
                'nights' => $start->diffInDays($end),
            ],
            'summary' => [
                'records_count' => $reservations->count() + $blocks->count(),
                'arrivals_count' => $arrivals->count(),
                'departures_count' => $departures->count(),
                'arriving_guests_count' => (int) $arrivals->sum('guests_count'),
                'departing_guests_count' => (int) $departures->sum('guests_count'),
                'active_quotes_count' => $quotes->count(),
                'blocks_count' => $blocks->count(),
            ],
            'reservations' => $reservations
                ->map(fn (Reservation $reservation): array => $this->agendaReservationPayload($reservation))
                ->all(),
            'blocks' => $blocks
                ->map(fn (AvailabilityBlock $block): array => $this->agendaBlockPayload($block, $cabins))
                ->all(),
        ];
    }

    public function getAdminCalendar(?string $month = null, ?int $year = null): array
    {
        if ($month) {
            $start = Carbon::parse($month.'-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $mode = 'month';
        } else {
            $year ??= now()->year;
            $start = Carbon::create($year, 1, 1)->startOfYear();
            $end = $start->copy()->endOfYear();
            $mode = 'year';
        }

        $endExclusive = $end->copy()->addDay();
        $cabins = $this->cabinsForAvailability(admin: true);
        $cabinIds = $cabins->pluck('id')->map(fn ($id) => (int) $id)->values();
        $totalCabins = $cabinIds->count();

        $reservations = Reservation::query()
            ->with(['cabins:id,name,map_slot', 'cabin:id,name,map_slot'])
            ->whereNotIn('status', [
                ReservationStatus::Cancelled->value,
                ReservationStatus::NoShow->value,
            ])
            ->overlapping($start, $endExclusive)
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id,name,map_slot')
            ->overlapping($start, $endExclusive)
            ->get();

        $days = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $unavailableCabinIds = $this->unavailableCabinIdsForDay(
                $date,
                $reservations->filter(fn (Reservation $reservation) => $this->reservationBlocksAvailability($reservation)),
                $blocks,
                $cabinIds,
            );
            $available = max(0, $totalCabins - $unavailableCabinIds->intersect($cabinIds)->unique()->count());

            $days[] = [
                'date' => $date->format('Y-m-d'),
                'available' => $available,
                'total' => $totalCabins,
                'status' => $available === 0 ? 'full' : ($available <= 2 ? 'limited' : 'available'),
            ];
        }

        $events = $reservations
            ->map(fn (Reservation $reservation) => $this->reservationEvent($reservation))
            ->concat($blocks->map(fn (AvailabilityBlock $block) => $this->blockEvent($block, $cabinIds)))
            ->sortBy([
                ['check_in', 'asc'],
                ['type', 'desc'],
            ])
            ->values();

        $daysCollection = collect($days);

        return [
            'period' => [
                'mode' => $mode,
                'month' => $month,
                'year' => (int) $start->year,
                'start' => $start->format('Y-m-d'),
                'end' => $end->format('Y-m-d'),
            ],
            'cabins' => $cabins->map(fn (Cabin $cabin) => [
                'id' => $cabin->id,
                'name' => $cabin->name,
                'map_slot' => $cabin->map_slot,
                'max_guests' => $cabin->max_guests,
            ])->values(),
            'days' => $days,
            'events' => $events,
            'summary' => [
                'total_days' => $daysCollection->count(),
                'available_days' => $daysCollection->where('status', 'available')->count(),
                'limited_days' => $daysCollection->where('status', 'limited')->count(),
                'full_days' => $daysCollection->where('status', 'full')->count(),
                'events_count' => $events->count(),
            ],
        ];
    }

    public function unavailableCabinIdsForRange(
        string $checkIn,
        string $checkOut,
        array $cabinIds,
        ?int $ignoreReservationId = null,
        ?int $ignoreBlockId = null,
        bool $includeCabinStatus = true,
    ): Collection {
        $checkInDate = Carbon::parse($checkIn)->startOfDay();
        $checkOutDate = Carbon::parse($checkOut)->startOfDay();
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
            ->blockingAvailability()
            ->when($ignoreReservationId, fn ($query) => $query->whereKeyNot($ignoreReservationId))
            ->overlapping($checkInDate, $checkOutDate)
            ->forCabins($cabinIds)
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

    private function buildPlannerCabin(
        Cabin $cabin,
        Collection $reservations,
        Collection $quotes,
        Collection $blocks,
        Carbon $checkInDate,
        Carbon $checkOutDate,
        ?int $guests,
    ): array {
        $segments = $this->buildPlannerSegments($cabin, $reservations, $quotes, $blocks, $checkInDate, $checkOutDate);
        $availableForRange = $segments->every(fn (array $segment) => $segment['is_available']);

        return [
            'cabin_id' => $cabin->id,
            'name' => $cabin->name,
            'map_slot' => $cabin->map_slot,
            'max_guests' => $cabin->max_guests,
            'fits_guests' => ! $guests || $cabin->max_guests >= $guests,
            'available_for_range' => $availableForRange,
            'segments' => $segments->values(),
            'cabin' => $cabin,
        ];
    }

    private function buildPlannerSegments(
        Cabin $cabin,
        Collection $reservations,
        Collection $quotes,
        Collection $blocks,
        Carbon $checkInDate,
        Carbon $checkOutDate,
    ): Collection {
        $segments = collect();
        $current = null;

        for ($date = $checkInDate->copy(); $date->lt($checkOutDate); $date->addDay()) {
            $state = $this->plannerStateForDate($cabin, $reservations, $quotes, $blocks, $date);
            $signature = $this->plannerStateSignature($state);

            if ($current && $current['signature'] === $signature) {
                $current['check_out'] = $date->copy()->addDay()->format('Y-m-d');

                continue;
            }

            if ($current) {
                unset($current['signature']);
                $segments->push($current);
            }

            $current = [
                'check_in' => $date->format('Y-m-d'),
                'check_out' => $date->copy()->addDay()->format('Y-m-d'),
                'state' => $state['state'],
                'tone' => $state['tone'],
                'label' => $state['label'],
                'is_available' => $state['is_available'],
                'reservation' => $state['reservation'],
                'quotes' => $state['quotes'],
                'block' => $state['block'],
                'signature' => $signature,
            ];
        }

        if ($current) {
            unset($current['signature']);
            $segments->push($current);
        }

        return $segments;
    }

    private function plannerStateForDate(
        Cabin $cabin,
        Collection $reservations,
        Collection $quotes,
        Collection $blocks,
        Carbon $date,
    ): array {
        $quotePayloads = $this->quotesForCabinOnDate($quotes, $cabin, $date)
            ->map(fn (Reservation $quote) => $this->plannerReservationPayload($quote))
            ->values()
            ->all();

        if (! $cabin->is_active || $cabin->status === CabinStatus::Inactive) {
            return $this->plannerState('inactive', 'gray', 'Inactiva', quotes: $quotePayloads);
        }

        if ($cabin->status === CabinStatus::Maintenance) {
            return $this->plannerState('maintenance', 'orange', 'Mantenimiento', quotes: $quotePayloads);
        }

        $reservation = $this->reservationForCabinOnDate($reservations, $cabin, $date);

        if ($reservation) {
            return $this->plannerState(
                state: 'reserved',
                tone: 'red',
                label: $reservation->leader_name ? "Ocupada: {$reservation->leader_name}" : 'Ocupada',
                reservation: $this->plannerReservationPayload($reservation),
                quotes: $quotePayloads,
            );
        }

        $block = $this->blockForCabinOnDate($blocks, $cabin, $date);

        if ($block) {
            return $this->plannerState(
                state: 'blocked',
                tone: 'orange',
                label: $block->reason,
                quotes: $quotePayloads,
                block: [
                    'id' => $block->id,
                    'reason' => $block->reason,
                    'notes' => $block->notes,
                    'applies_to_all' => $block->applies_to_all,
                    'check_in' => $block->check_in->format('Y-m-d'),
                    'check_out' => $block->check_out->format('Y-m-d'),
                    'cabin_ids' => $block->cabins->pluck('id')->map(fn ($id) => (int) $id)->values(),
                    'cabin_names' => $block->applies_to_all
                        ? ['Todas las cabanas']
                        : $block->cabins->pluck('name')->values(),
                ],
            );
        }

        return $this->plannerState(
            'available',
            'green',
            'Disponible',
            quotes: $quotePayloads,
            isAvailable: true,
        );
    }

    private function plannerState(
        string $state,
        string $tone,
        string $label,
        ?array $reservation = null,
        array $quotes = [],
        ?array $block = null,
        bool $isAvailable = false,
    ): array {
        return [
            'state' => $state,
            'tone' => $tone,
            'label' => $label,
            'is_available' => $isAvailable,
            'reservation' => $reservation,
            'quotes' => $quotes,
            'block' => $block,
        ];
    }

    private function reservationForCabinOnDate(Collection $reservations, Cabin $cabin, Carbon $date): ?Reservation
    {
        return $reservations->first(function (Reservation $reservation) use ($cabin, $date): bool {
            if (! ($date->gte($reservation->check_in) && $date->lt($reservation->check_out))) {
                return false;
            }

            return $this->reservationCabinIds($reservation)->contains((int) $cabin->id);
        });
    }

    private function quotesForCabinOnDate(Collection $quotes, Cabin $cabin, Carbon $date): Collection
    {
        return $quotes->filter(function (Reservation $quote) use ($cabin, $date): bool {
            if (! ($date->gte($quote->check_in) && $date->lt($quote->check_out))) {
                return false;
            }

            return $this->reservationCabinIds($quote)->contains((int) $cabin->id);
        });
    }

    private function blockForCabinOnDate(Collection $blocks, Cabin $cabin, Carbon $date): ?AvailabilityBlock
    {
        return $blocks->first(function (AvailabilityBlock $block) use ($cabin, $date): bool {
            if (! ($date->gte($block->check_in) && $date->lt($block->check_out))) {
                return false;
            }

            return $block->applies_to_all || $block->cabins->pluck('id')->contains((int) $cabin->id);
        });
    }

    private function plannerReservationPayload(Reservation $reservation): array
    {
        $cabinIds = $this->reservationCabinIds($reservation);
        $cabins = $reservation->relationLoaded('cabins') && $reservation->cabins->isNotEmpty()
            ? $reservation->cabins
            : collect([$reservation->cabin])->filter();

        return [
            'id' => $reservation->id,
            'status' => $reservation->status->value,
            'status_label' => $reservation->status->label(),
            'leader_name' => $reservation->leader_name,
            'display_color' => $reservation->display_color,
            'check_in' => $reservation->check_in->format('Y-m-d'),
            'check_out' => $reservation->check_out->format('Y-m-d'),
            'guests_count' => $reservation->guests_count,
            'total_price' => $reservation->total_price !== null ? (float) $reservation->total_price : null,
            'notes' => $reservation->notes,
            'source' => $reservation->source,
            'expires_at' => $reservation->expires_at?->toISOString(),
            'confirmed_at' => $reservation->confirmed_at?->toISOString(),
            'cabin_ids' => $cabinIds->values(),
            'cabin_names' => $cabins->pluck('name')->values(),
            'assigned_to' => $reservation->assigned_to,
            'assigned_staff' => $reservation->relationLoaded('assignedStaff') && $reservation->assignedStaff
                ? [
                    'id' => $reservation->assignedStaff->id,
                    'full_name' => $reservation->assignedStaff->full_name,
                    'role' => $reservation->assignedStaff->role->value,
                    'role_label' => $reservation->assignedStaff->role->label(),
                ]
                : null,
        ];
    }

    private function agendaReservationPayload(Reservation $reservation): array
    {
        $cabinIds = $this->reservationCabinIds($reservation);
        $cabins = $reservation->relationLoaded('cabins') && $reservation->cabins->isNotEmpty()
            ? $reservation->cabins
            : collect([$reservation->cabin])->filter();

        return [
            'id' => $reservation->id,
            'status' => $reservation->status->value,
            'status_label' => $reservation->status->label(),
            'leader_name' => $reservation->leader_name,
            'display_color' => $reservation->display_color,
            'check_in' => $reservation->check_in->format('Y-m-d'),
            'check_out' => $reservation->check_out->format('Y-m-d'),
            'guests_count' => (int) $reservation->guests_count,
            'notes' => $reservation->notes,
            'source' => $reservation->source,
            'expires_at' => $reservation->expires_at?->toISOString(),
            'confirmed_at' => $reservation->confirmed_at?->toISOString(),
            'cabin_ids' => $cabinIds->values()->all(),
            'cabin_names' => $cabins->pluck('name')->values()->all(),
            'assigned_to' => $reservation->assigned_to,
            'assigned_staff' => $reservation->relationLoaded('assignedStaff') && $reservation->assignedStaff
                ? [
                    'id' => $reservation->assignedStaff->id,
                    'full_name' => $reservation->assignedStaff->full_name,
                    'role' => $reservation->assignedStaff->role->value,
                    'role_label' => $reservation->assignedStaff->role->label(),
                ]
                : null,
        ];
    }

    private function agendaBlockPayload(AvailabilityBlock $block, Collection $allCabins): array
    {
        return [
            'id' => $block->id,
            'check_in' => $block->check_in->format('Y-m-d'),
            'check_out' => $block->check_out->format('Y-m-d'),
            'reason' => $block->reason,
            'notes' => $block->notes,
            'applies_to_all' => $block->applies_to_all,
            'cabin_ids' => $block->applies_to_all
                ? $allCabins->pluck('id')->map(fn ($id): int => (int) $id)->values()->all()
                : $block->cabins->pluck('id')->map(fn ($id): int => (int) $id)->values()->all(),
            'cabin_names' => $block->applies_to_all
                ? ['Todas las cabanas']
                : $block->cabins->pluck('name')->values()->all(),
        ];
    }

    private function plannerStateSignature(array $state): string
    {
        return implode(':', [
            $state['state'],
            $state['reservation']['id'] ?? 'none',
            $state['block']['id'] ?? 'none',
            collect($state['quotes'])->pluck('id')->sort()->implode(','),
        ]);
    }

    private function hasPlannerState(array $entry, string $state): bool
    {
        return collect($entry['segments'])->contains(fn (array $segment) => $segment['state'] === $state);
    }

    private function buildCabinSuggestions(Collection $availableForRange, ?int $guests): array
    {
        if (! $guests || $availableForRange->isEmpty()) {
            return [];
        }

        $cabins = $availableForRange->values();
        $count = $cabins->count();
        $suggestions = [];

        for ($mask = 1; $mask < (1 << $count); $mask++) {
            $selected = collect();

            for ($index = 0; $index < $count; $index++) {
                if ($mask & (1 << $index)) {
                    $selected->push($cabins[$index]);
                }
            }

            $capacity = $selected->sum('max_guests');

            if ($capacity < $guests) {
                continue;
            }

            $suggestions[] = [
                'cabin_ids' => $selected->pluck('cabin_id')->values()->all(),
                'capacity' => $capacity,
                'capacity_extra' => $capacity - $guests,
                'cabins_count' => $selected->count(),
                'cabins' => $selected
                    ->map(fn (array $entry) => [
                        'id' => $entry['cabin_id'],
                        'name' => $entry['name'],
                        'map_slot' => $entry['map_slot'],
                        'max_guests' => $entry['max_guests'],
                    ])
                    ->values()
                    ->all(),
            ];
        }

        return collect($suggestions)
            ->sortBy([
                ['cabins_count', 'asc'],
                ['capacity_extra', 'asc'],
                ['capacity', 'asc'],
            ])
            ->take(8)
            ->values()
            ->all();
    }

    private function cabinsForAvailability(bool $admin): Collection
    {
        return Cabin::query()
            ->with([
                'type',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->whereNotNull('map_slot')
            ->when(! $admin, fn ($query) => $query->whereNotNull('slug'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    private function unavailableCabinIdsForDay(
        Carbon $date,
        Collection $reservations,
        Collection $blocks,
        Collection $cabinIds,
    ): Collection {
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

        return $unavailableCabinIds->map(fn ($id) => (int) $id)->unique()->values();
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
        } elseif (! $cabin->is_active || $cabin->status !== CabinStatus::Available) {
            $state = 'inactive';
            $tone = 'gray';
            $label = $admin ? $cabin->status->label() : 'No disponible';
            $isAvailable = false;
        } else {
            $state = 'available';
            $tone = 'green';
            $label = 'Disponible';
            $isAvailable = true;
        }

        return [
            'cabin_id' => $cabin->id,
            'map_slot' => $cabin->map_slot,
            'state' => $state,
            'tone' => $tone,
            'label' => $label,
            'is_available' => $isAvailable,
            'fits_guests' => $fitsGuests,
            'leader_name' => $admin ? $reservation?->leader_name : null,
            'display_color' => $admin ? $reservation?->display_color : null,
            'reservation' => $admin && $reservation ? $this->reservationPayload($reservation) : null,
            'block' => $block ? [
                'id' => $block->id,
                'reason' => $admin ? $block->reason : 'No disponible',
                'notes' => $admin ? $block->notes : null,
                'applies_to_all' => $block->applies_to_all,
            ] : null,
            'cabin' => $cabin,
        ];
    }

    private function reservationPayload(Reservation $reservation): array
    {
        return [
            'id' => $reservation->id,
            'status' => $reservation->status->value,
            'status_label' => $reservation->status->label(),
            'leader_name' => $reservation->leader_name,
            'display_color' => $reservation->display_color,
            'check_in' => $reservation->check_in->format('Y-m-d'),
            'check_out' => $reservation->check_out->format('Y-m-d'),
            'guests_count' => $reservation->guests_count,
            'expires_at' => $reservation->expires_at?->toISOString(),
            'confirmed_at' => $reservation->confirmed_at?->toISOString(),
            'is_expired_quote' => $reservation->isExpiredQuote(),
            'expires_soon' => $reservation->isQuoteExpiringSoon(),
        ];
    }

    private function reservationEvent(Reservation $reservation): array
    {
        $cabinIds = $this->reservationCabinIds($reservation);
        $cabins = $reservation->relationLoaded('cabins') && $reservation->cabins->isNotEmpty()
            ? $reservation->cabins
            : collect([$reservation->cabin])->filter();

        return [
            'id' => $reservation->id,
            'type' => 'reservation',
            'status' => $reservation->status->value,
            'status_label' => $reservation->status->label(),
            'leader_name' => $reservation->leader_name,
            'display_color' => $reservation->display_color,
            'check_in' => $reservation->check_in->format('Y-m-d'),
            'check_out' => $reservation->check_out->format('Y-m-d'),
            'guests_count' => $reservation->guests_count,
            'total_price' => $reservation->total_price !== null ? (float) $reservation->total_price : null,
            'notes' => $reservation->notes,
            'expires_at' => $reservation->expires_at?->toISOString(),
            'confirmed_at' => $reservation->confirmed_at?->toISOString(),
            'is_expired_quote' => $reservation->isExpiredQuote(),
            'expires_soon' => $reservation->isQuoteExpiringSoon(),
            'blocks_availability' => $this->reservationBlocksAvailability($reservation),
            'cabin_ids' => $cabinIds->values(),
            'cabin_names' => $cabins->pluck('name')->values(),
        ];
    }

    private function blockEvent(AvailabilityBlock $block, Collection $allCabinIds): array
    {
        $cabinIds = $block->applies_to_all
            ? $allCabinIds
            : $block->cabins->pluck('id')->map(fn ($id) => (int) $id)->values();

        return [
            'id' => $block->id,
            'type' => 'block',
            'status' => 'blocked',
            'status_label' => 'Bloqueo',
            'leader_name' => $block->reason,
            'display_color' => '#f59e0b',
            'check_in' => $block->check_in->format('Y-m-d'),
            'check_out' => $block->check_out->format('Y-m-d'),
            'guests_count' => null,
            'total_price' => null,
            'notes' => $block->notes,
            'expires_at' => null,
            'confirmed_at' => null,
            'is_expired_quote' => false,
            'expires_soon' => false,
            'blocks_availability' => true,
            'cabin_ids' => $cabinIds,
            'cabin_names' => $block->applies_to_all
                ? ['Todas las cabanas']
                : $block->cabins->pluck('name')->values(),
        ];
    }

    private function reservationBlocksAvailability(Reservation $reservation): bool
    {
        return $reservation->status->blocksAvailability();
    }

    private function reservationLabel(Reservation $reservation): string
    {
        if ($reservation->status === ReservationStatus::Pending) {
            return $reservation->leader_name ? "Cotizada: {$reservation->leader_name}" : 'Cotizada';
        }

        if ($reservation->status === ReservationStatus::CheckedIn) {
            return $reservation->leader_name ? "Hospedada: {$reservation->leader_name}" : 'Hospedada';
        }

        return $reservation->leader_name ? "Reservada: {$reservation->leader_name}" : 'Reservada';
    }

    private function availabilityMessage(array $summary): string
    {
        if ($summary['available_count'] > 0) {
            return "Hay {$summary['available_count']} cabanas disponibles para estas fechas. La disponibilidad es orientativa y la confirmacion final la hace el administrador.";
        }

        return 'No aparecen cabanas disponibles para estas fechas. Escribenos para revisar cambios recientes u otras opciones.';
    }
}
