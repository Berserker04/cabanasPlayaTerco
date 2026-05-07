<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePaymentRequest;
use App\Http\Requests\Admin\UpdatePaymentRequest;
use App\Http\Resources\PaymentIncomeResource;
use App\Models\PaymentIncome;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $payments = PaymentIncome::query()
            ->with(['reservation.cabin', 'reservation.cabins', 'guestGroup', 'recorder'])
            ->when($request->reservation_id, fn ($q, $id) => $q->where('reservation_id', $id))
            ->when($request->from, fn ($q, $d) => $q->where('payment_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->where('payment_date', '<=', $d))
            ->latest('payment_date')
            ->paginate(20);

        return response()->json([
            'data' => PaymentIncomeResource::collection($payments),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'per_page'     => $payments->perPage(),
                'total'        => $payments->total(),
            ],
        ]);
    }

    public function store(StorePaymentRequest $request): JsonResponse
    {
        $payment = PaymentIncome::create([
            ...$request->validated(),
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data'    => new PaymentIncomeResource($payment->load('recorder')),
            'message' => 'Pago registrado.',
        ], 201);
    }

    public function update(UpdatePaymentRequest $request, PaymentIncome $payment): JsonResponse
    {
        $payment->update($request->validated());

        return response()->json([
            'data'    => new PaymentIncomeResource($payment->fresh()->load('recorder')),
            'message' => 'Pago actualizado.',
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'year' => ['nullable', 'integer', 'min:2020'],
        ]);

        $year = $request->integer('year', now()->year);

        $summary = PaymentIncome::query()
            ->whereYear('payment_date', $year)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total, COUNT(*) as count')
            ->groupByRaw('MONTH(payment_date)')
            ->orderBy('month')
            ->get();

        return response()->json([
            'data' => [
                'year'    => $year,
                'months'  => $summary,
                'total'   => $summary->sum('total'),
            ],
        ]);
    }
}
