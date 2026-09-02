<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExpenseRequest;
use App\Http\Requests\Admin\UpdateExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'string'],
            'category' => ['nullable', 'string'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $expenses = Expense::query()
            ->with('recorder')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->when($request->filled('from'), fn ($query) => $query->where('due_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->where('due_date', '<=', $request->date('to')))
            ->orderBy('due_date')
            ->paginate(20);

        return response()->json([
            'data' => ExpenseResource::collection($expenses),
            'meta' => [
                'current_page' => $expenses->currentPage(),
                'last_page' => $expenses->lastPage(),
                'per_page' => $expenses->perPage(),
                'total' => $expenses->total(),
            ],
        ]);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['status'] ??= ExpenseStatus::Pending->value;

        $expense = Expense::create([
            ...$data,
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => new ExpenseResource($expense->load('recorder')),
            'message' => 'Gasto registrado.',
        ], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json([
            'data' => new ExpenseResource($expense->load('recorder')),
        ]);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): JsonResponse
    {
        $expense->update($request->validated());

        return response()->json([
            'data' => new ExpenseResource($expense->fresh()->load('recorder')),
            'message' => 'Gasto actualizado.',
        ]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->update(['status' => ExpenseStatus::Cancelled]);

        return response()->json([
            'message' => 'Gasto cancelado.',
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'year' => ['nullable', 'integer', 'min:2020'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $query = Expense::query();

        if ($request->filled('month')) {
            $start = \Carbon\Carbon::parse($request->string('month')->toString() . '-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $query->whereBetween('due_date', [$start, $end]);
        } else {
            $query->whereYear('due_date', $request->integer('year', now()->year));
        }

        $expenses = $query->get();
        $pending = $expenses->where('status', ExpenseStatus::Pending);
        $paid = $expenses->where('status', ExpenseStatus::Paid);

        return response()->json([
            'data' => [
                'total_pending' => (float) $pending->sum('amount'),
                'total_paid' => (float) $paid->sum('amount'),
                'pending_count' => $pending->count(),
                'paid_count' => $paid->count(),
                'overdue_count' => $pending->filter(fn (Expense $expense) => $expense->due_date->isPast())->count(),
                'next_expenses' => ExpenseResource::collection(
                    $pending->sortBy('due_date')->take(5)->values()
                ),
            ],
        ]);
    }
}
