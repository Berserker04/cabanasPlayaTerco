<?php

namespace App\Services;

use App\Enums\CabinStatus;
use App\Enums\LeadStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\Expense;
use App\Models\GuestGroup;
use App\Models\Lead;
use App\Models\PaymentIncome;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\StaffPayment;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /** @var array<int, string> */
    private const MONTH_LABELS = [
        1 => 'Ene',
        2 => 'Feb',
        3 => 'Mar',
        4 => 'Abr',
        5 => 'May',
        6 => 'Jun',
        7 => 'Jul',
        8 => 'Ago',
        9 => 'Sep',
        10 => 'Oct',
        11 => 'Nov',
        12 => 'Dic',
    ];

    public function getStats(): array
    {
        $year = Carbon::now()->year;

        return [
            'tourists_by_month' => $this->touristsByMonth($year),
            'occupancy_by_month' => $this->occupancyByMonth($year),
            'avg_group_size' => $this->avgGroupSize(),
            'income_by_month' => $this->incomeByMonth($year),
            'staff_costs_by_month' => $this->staffCostsByMonth($year),
            'pending_reviews' => Review::where('status', ReviewStatus::Pending)->count(),
            'unanswered_leads' => Lead::where('status', LeadStatus::New)->count(),
            'upcoming_arrivals' => Reservation::query()
                ->active()
                ->whereBetween('check_in', [today(), today()->addDays(7)])
                ->count(),
            'monthly_income' => PaymentIncome::query()
                ->whereYear('payment_date', now()->year)
                ->whereMonth('payment_date', now()->month)
                ->sum('amount'),
            'upcoming_expenses' => Expense::query()
                ->pending()
                ->whereBetween('due_date', [today(), today()->addDays(30)])
                ->sum('amount'),
        ];
    }

    public function getOperationalStats(?int $year = null): array
    {
        $timezone = (string) config('dashboard.timezone', 'America/Bogota');
        $now = CarbonImmutable::now($timezone);
        $selectedYear = $year ?? $now->year;
        $yearStart = CarbonImmutable::create($selectedYear, 1, 1, 0, 0, 0, $timezone);
        $yearEnd = $yearStart->addYear();
        $cabins = $this->operationalCabins();
        $cabinIds = $cabins->pluck('id')->map(fn ($id): int => (int) $id)->values();

        $reservations = Reservation::query()
            ->with('cabins:id')
            ->whereIn('status', $this->operationalReservationStatuses())
            ->overlapping($yearStart, $yearEnd)
            ->get();

        $blocks = AvailabilityBlock::query()
            ->with('cabins:id')
            ->overlapping($yearStart, $yearEnd)
            ->get();

        return [
            'period' => [
                'year' => $selectedYear,
                'available_years' => $this->availableYears($now->year),
                'generated_at' => $now->toIso8601String(),
                'timezone' => $timezone,
            ],
            'today' => $this->todaySnapshot($now->startOfDay(), $cabinIds),
            'next_7_days' => $this->upcomingArrivals($now->startOfDay()),
            'alerts' => $this->operationalAlerts($now),
            'months' => $this->operationalMonths(
                $yearStart,
                $yearEnd,
                $cabinIds,
                $reservations,
                $blocks,
            ),
        ];
    }

    /** @return Collection<int, Cabin> */
    private function operationalCabins(): Collection
    {
        return Cabin::query()
            ->select(['id', 'name', 'map_slot', 'status'])
            ->where('is_active', true)
            ->whereNotNull('map_slot')
            ->whereIn('status', [
                CabinStatus::Available->value,
                CabinStatus::Occupied->value,
            ])
            ->orderBy('id')
            ->get();
    }

    /** @return list<string> */
    private function operationalReservationStatuses(): array
    {
        return [
            ReservationStatus::Confirmed->value,
            ReservationStatus::CheckedIn->value,
            ReservationStatus::CheckedOut->value,
        ];
    }

    /**
     * @param  Collection<int, int>  $cabinIds
     * @return array{occupied_cabins: int, operational_cabins: int, blocked_cabins: int, occupancy_rate: float}
     */
    private function todaySnapshot(CarbonImmutable $today, Collection $cabinIds): array
    {
        $tomorrow = $today->addDay();
        $reservations = Reservation::query()
            ->with('cabins:id')
            ->whereIn('status', $this->operationalReservationStatuses())
            ->overlapping($today, $tomorrow)
            ->get();
        $blocks = AvailabilityBlock::query()
            ->with('cabins:id')
            ->overlapping($today, $tomorrow)
            ->get();

        $occupiedByDate = $this->occupiedCabinsByDate($reservations, $today, $tomorrow, $cabinIds);
        $blockedByDate = $this->blockedCabinsByDate($blocks, $today, $tomorrow, $cabinIds);
        $dateKey = $today->format('Y-m-d');
        $blocked = collect(array_keys($blockedByDate[$dateKey] ?? []));
        $sellable = $cabinIds->diff($blocked);
        $occupied = collect(array_keys($occupiedByDate[$dateKey] ?? []))->intersect($sellable);
        $sellableCount = $sellable->count();

        return [
            'occupied_cabins' => $occupied->count(),
            'operational_cabins' => $cabinIds->count(),
            'blocked_cabins' => $blocked->intersect($cabinIds)->count(),
            'occupancy_rate' => $sellableCount > 0
                ? round(min(100, ($occupied->count() / $sellableCount) * 100), 1)
                : 0.0,
        ];
    }

    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     arrivals_count: int,
     *     guests_count: int,
     *     arrivals: array<int, array<string, mixed>>
     * }
     */
    private function upcomingArrivals(CarbonImmutable $today): array
    {
        $windowEnd = $today->addDays(7);
        $query = Reservation::query()
            ->where('status', ReservationStatus::Confirmed->value)
            ->where('check_in', '>=', $today)
            ->where('check_in', '<', $windowEnd->addDay());

        $arrivalsCount = (clone $query)->count();
        $guestsCount = (int) (clone $query)->sum('guests_count');
        $arrivals = (clone $query)
            ->with(['cabins:id,name', 'cabin:id,name'])
            ->orderBy('check_in')
            ->orderBy('id')
            ->limit(6)
            ->get()
            ->map(function (Reservation $reservation): array {
                $cabins = $reservation->cabins->isNotEmpty()
                    ? $reservation->cabins
                    : collect([$reservation->cabin])->filter();
                $cabinIds = $this->reservationCabinIds($reservation);

                return [
                    'id' => $reservation->id,
                    'check_in' => $reservation->check_in->format('Y-m-d'),
                    'check_out' => $reservation->check_out->format('Y-m-d'),
                    'leader_name' => $reservation->leader_name,
                    'guests_count' => (int) $reservation->guests_count,
                    'status' => $reservation->status->value,
                    'status_label' => $reservation->status->label(),
                    'cabin_ids' => $cabinIds->values()->all(),
                    'cabin_names' => $cabins->pluck('name')->values()->all(),
                ];
            })
            ->values()
            ->all();

        return [
            'from' => $today->format('Y-m-d'),
            'to' => $windowEnd->format('Y-m-d'),
            'arrivals_count' => $arrivalsCount,
            'guests_count' => $guestsCount,
            'arrivals' => $arrivals,
        ];
    }

    /** @return array{active_quotes: int, expiring_quotes_next_12_hours: int, pending_reviews: int, unanswered_leads: int} */
    private function operationalAlerts(CarbonImmutable $now): array
    {
        $activeQuotes = Reservation::query()
            ->where('status', ReservationStatus::Pending->value)
            ->where('check_out', '>', $now->startOfDay()->format('Y-m-d'))
            ->where(function ($query) use ($now): void {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>', $now);
            });

        $expiringQuotes = (clone $activeQuotes)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now->addHours(12))
            ->count();

        return [
            'active_quotes' => (clone $activeQuotes)->count(),
            'expiring_quotes_next_12_hours' => $expiringQuotes,
            'pending_reviews' => Review::query()->where('status', ReviewStatus::Pending->value)->count(),
            'unanswered_leads' => Lead::query()->where('status', LeadStatus::New->value)->count(),
        ];
    }

    /**
     * @param  Collection<int, int>  $cabinIds
     * @param  Collection<int, Reservation>  $reservations
     * @param  Collection<int, AvailabilityBlock>  $blocks
     * @return array<int, array<string, int|float|string>>
     */
    private function operationalMonths(
        CarbonImmutable $yearStart,
        CarbonImmutable $yearEnd,
        Collection $cabinIds,
        Collection $reservations,
        Collection $blocks,
    ): array {
        $occupiedByDate = $this->occupiedCabinsByDate($reservations, $yearStart, $yearEnd, $cabinIds);
        $blockedByDate = $this->blockedCabinsByDate($blocks, $yearStart, $yearEnd, $cabinIds);

        return collect(range(1, 12))
            ->map(function (int $month) use (
                $yearStart,
                $cabinIds,
                $reservations,
                $occupiedByDate,
                $blockedByDate,
            ): array {
                $monthStart = $yearStart->setMonth($month)->startOfMonth();
                $monthEnd = $monthStart->addMonth();
                $occupiedNights = 0;
                $operationalNights = 0;

                for ($date = $monthStart; $date->lt($monthEnd); $date = $date->addDay()) {
                    $dateKey = $date->format('Y-m-d');
                    $blocked = collect(array_keys($blockedByDate[$dateKey] ?? []));
                    $sellable = $cabinIds->diff($blocked);
                    $occupied = collect(array_keys($occupiedByDate[$dateKey] ?? []))->intersect($sellable);

                    $operationalNights += $sellable->count();
                    $occupiedNights += $occupied->count();
                }

                $monthlyReservations = $reservations->filter(
                    fn (Reservation $reservation): bool => $reservation->check_in->year === $yearStart->year
                        && $reservation->check_in->month === $month
                );

                return [
                    'month' => $month,
                    'label' => self::MONTH_LABELS[$month],
                    'occupied_nights' => $occupiedNights,
                    'operational_nights' => $operationalNights,
                    'occupancy_rate' => $operationalNights > 0
                        ? round(min(100, ($occupiedNights / $operationalNights) * 100), 1)
                        : 0.0,
                    'reservations_count' => $monthlyReservations->count(),
                    'guests_count' => (int) $monthlyReservations->sum('guests_count'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @param  Collection<int, int>  $cabinIds
     * @return array<string, array<int, true>>
     */
    private function occupiedCabinsByDate(
        Collection $reservations,
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        Collection $cabinIds,
    ): array {
        $occupied = [];
        $timezone = $periodStart->getTimezone()->getName();

        foreach ($reservations as $reservation) {
            $reservationCabinIds = $this->reservationCabinIds($reservation)->intersect($cabinIds);
            $start = CarbonImmutable::parse($reservation->check_in->format('Y-m-d'), $timezone)->max($periodStart);
            $end = CarbonImmutable::parse($reservation->check_out->format('Y-m-d'), $timezone)->min($periodEnd);

            for ($date = $start; $date->lt($end); $date = $date->addDay()) {
                $dateKey = $date->format('Y-m-d');

                foreach ($reservationCabinIds as $cabinId) {
                    $occupied[$dateKey][(int) $cabinId] = true;
                }
            }
        }

        return $occupied;
    }

    /**
     * @param  Collection<int, AvailabilityBlock>  $blocks
     * @param  Collection<int, int>  $cabinIds
     * @return array<string, array<int, true>>
     */
    private function blockedCabinsByDate(
        Collection $blocks,
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        Collection $cabinIds,
    ): array {
        $blocked = [];
        $timezone = $periodStart->getTimezone()->getName();

        foreach ($blocks as $block) {
            $targetIds = $block->applies_to_all
                ? $cabinIds
                : $block->cabins->pluck('id')->map(fn ($id): int => (int) $id)->intersect($cabinIds);
            $start = CarbonImmutable::parse($block->check_in->format('Y-m-d'), $timezone)->max($periodStart);
            $end = CarbonImmutable::parse($block->check_out->format('Y-m-d'), $timezone)->min($periodEnd);

            for ($date = $start; $date->lt($end); $date = $date->addDay()) {
                $dateKey = $date->format('Y-m-d');

                foreach ($targetIds as $cabinId) {
                    $blocked[$dateKey][(int) $cabinId] = true;
                }
            }
        }

        return $blocked;
    }

    /** @return Collection<int, int> */
    private function reservationCabinIds(Reservation $reservation): Collection
    {
        $ids = $reservation->relationLoaded('cabins')
            ? $reservation->cabins->pluck('id')
            : collect();

        if ($ids->isEmpty() && $reservation->cabin_id) {
            $ids->push($reservation->cabin_id);
        }

        return $ids->map(fn ($id): int => (int) $id)->unique()->values();
    }

    /** @return list<int> */
    private function availableYears(int $currentYear): array
    {
        $bounds = Reservation::query()
            ->selectRaw('MIN(check_in) as first_date, MAX(check_in) as last_date')
            ->first();

        if (! $bounds?->first_date || ! $bounds?->last_date) {
            return [$currentYear];
        }

        $firstYear = min($currentYear, CarbonImmutable::parse($bounds->first_date)->year);
        $lastYear = max($currentYear, CarbonImmutable::parse($bounds->last_date)->year);

        return range($lastYear, $firstYear);
    }

    private function touristsByMonth(int $year): array
    {
        $monthExpression = $this->monthExpression('check_in');

        return Reservation::query()
            ->whereYear('check_in', $year)
            ->whereNotIn('status', [ReservationStatus::Cancelled, ReservationStatus::NoShow])
            ->selectRaw("{$monthExpression} as month, SUM(guests_count) as total")
            ->groupByRaw($monthExpression)
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }

    private function occupancyByMonth(int $year): array
    {
        $monthExpression = $this->monthExpression('check_in');

        return Reservation::query()
            ->whereYear('check_in', $year)
            ->whereNotIn('status', [ReservationStatus::Cancelled, ReservationStatus::NoShow])
            ->selectRaw("{$monthExpression} as month, COUNT(*) as reservations")
            ->groupByRaw($monthExpression)
            ->orderBy('month')
            ->get()
            ->pluck('reservations', 'month')
            ->toArray();
    }

    private function avgGroupSize(): float
    {
        return round(
            GuestGroup::query()
                ->withCount('members')
                ->get()
                ->avg('members_count') ?? 0,
            1
        );
    }

    private function incomeByMonth(int $year): array
    {
        $monthExpression = $this->monthExpression('payment_date');

        return PaymentIncome::query()
            ->whereYear('payment_date', $year)
            ->selectRaw("{$monthExpression} as month, SUM(amount) as total")
            ->groupByRaw($monthExpression)
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }

    private function staffCostsByMonth(int $year): array
    {
        $monthExpression = $this->monthExpression('payment_date');

        return StaffPayment::query()
            ->whereYear('payment_date', $year)
            ->selectRaw("{$monthExpression} as month, SUM(amount) as total")
            ->groupByRaw($monthExpression)
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }

    private function monthExpression(string $column): string
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return "CAST(strftime('%m', {$column}) AS INTEGER)";
        }

        return "MONTH({$column})";
    }
}
