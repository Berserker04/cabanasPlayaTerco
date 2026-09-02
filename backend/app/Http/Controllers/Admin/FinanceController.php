<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ExpenseStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\PaymentIncome;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'year' => ['nullable', 'integer', 'min:2020'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $incomeQuery = PaymentIncome::query()
            ->whereIn('status', [PaymentStatus::Completed->value, PaymentStatus::Partial->value]);
        $expenseQuery = Expense::query()
            ->where('status', ExpenseStatus::Paid->value);
        $pendingExpenseQuery = Expense::query()
            ->where('status', ExpenseStatus::Pending->value);

        if ($request->filled('month')) {
            $start = \Carbon\Carbon::parse($request->string('month')->toString() . '-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $incomeQuery->whereBetween('payment_date', [$start, $end]);
            $expenseQuery->whereBetween('due_date', [$start, $end]);
            $pendingExpenseQuery->whereBetween('due_date', [$start, $end]);
        } else {
            $year = $request->integer('year', now()->year);
            $incomeQuery->whereYear('payment_date', $year);
            $expenseQuery->whereYear('due_date', $year);
            $pendingExpenseQuery->whereYear('due_date', $year);
        }

        $incomeTotal = (float) $incomeQuery->sum('amount');
        $expenseTotal = (float) $expenseQuery->sum('amount');
        $pendingExpenseTotal = (float) $pendingExpenseQuery->sum('amount');

        return response()->json([
            'data' => [
                'income_total' => $incomeTotal,
                'expense_total' => $expenseTotal,
                'pending_expense_total' => $pendingExpenseTotal,
                'net_total' => $incomeTotal - $expenseTotal,
            ],
        ]);
    }
}
