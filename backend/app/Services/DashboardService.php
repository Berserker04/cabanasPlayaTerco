<?php

namespace App\Services;

use App\Enums\LeadStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\GuestGroup;
use App\Models\Expense;
use App\Models\Lead;
use App\Models\PaymentIncome;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\StaffPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function getStats(): array
    {
        $year = Carbon::now()->year;

        return [
            'tourists_by_month'    => $this->touristsByMonth($year),
            'occupancy_by_month'   => $this->occupancyByMonth($year),
            'avg_group_size'       => $this->avgGroupSize(),
            'income_by_month'      => $this->incomeByMonth($year),
            'staff_costs_by_month' => $this->staffCostsByMonth($year),
            'pending_reviews'      => Review::where('status', ReviewStatus::Pending)->count(),
            'unanswered_leads'     => Lead::where('status', LeadStatus::New)->count(),
            'upcoming_arrivals'    => Reservation::query()
                ->active()
                ->whereBetween('check_in', [today(), today()->addDays(7)])
                ->count(),
            'monthly_income'       => PaymentIncome::query()
                ->whereYear('payment_date', now()->year)
                ->whereMonth('payment_date', now()->month)
                ->sum('amount'),
            'upcoming_expenses'    => Expense::query()
                ->pending()
                ->whereBetween('due_date', [today(), today()->addDays(30)])
                ->sum('amount'),
        ];
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
