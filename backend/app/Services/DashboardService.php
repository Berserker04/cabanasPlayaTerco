<?php

namespace App\Services;

use App\Enums\LeadStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\GuestGroup;
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
        ];
    }

    private function touristsByMonth(int $year): array
    {
        return Reservation::query()
            ->whereYear('check_in', $year)
            ->whereNotIn('status', [ReservationStatus::Cancelled, ReservationStatus::NoShow])
            ->selectRaw('MONTH(check_in) as month, SUM(guests_count) as total')
            ->groupByRaw('MONTH(check_in)')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }

    private function occupancyByMonth(int $year): array
    {
        return Reservation::query()
            ->whereYear('check_in', $year)
            ->whereNotIn('status', [ReservationStatus::Cancelled, ReservationStatus::NoShow])
            ->selectRaw('MONTH(check_in) as month, COUNT(*) as reservations')
            ->groupByRaw('MONTH(check_in)')
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
        return PaymentIncome::query()
            ->whereYear('payment_date', $year)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupByRaw('MONTH(payment_date)')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }

    private function staffCostsByMonth(int $year): array
    {
        return StaffPayment::query()
            ->whereYear('payment_date', $year)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total')
            ->groupByRaw('MONTH(payment_date)')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month')
            ->toArray();
    }
}
