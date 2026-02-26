<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStaffPaymentRequest;
use App\Http\Requests\Admin\StoreStaffRequest;
use App\Http\Requests\Admin\UpdateStaffRequest;
use App\Http\Resources\StaffPaymentResource;
use App\Http\Resources\StaffResource;
use App\Models\Staff;
use App\Models\StaffPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $staff = Staff::query()
            ->withCount('payments')
            ->when($request->boolean('active_only'), fn ($q) => $q->active())
            ->when($request->role, fn ($q, $r) => $q->where('role', $r))
            ->orderBy('full_name')
            ->paginate(20);

        return response()->json([
            'data' => StaffResource::collection($staff),
            'meta' => [
                'current_page' => $staff->currentPage(),
                'per_page'     => $staff->perPage(),
                'total'        => $staff->total(),
            ],
        ]);
    }

    public function store(StoreStaffRequest $request): JsonResponse
    {
        $staff = Staff::create($request->validated());

        return response()->json([
            'data'    => new StaffResource($staff),
            'message' => 'Empleado creado.',
        ], 201);
    }

    public function update(UpdateStaffRequest $request, Staff $staff): JsonResponse
    {
        $staff->update($request->validated());

        return response()->json([
            'data'    => new StaffResource($staff->fresh()),
            'message' => 'Empleado actualizado.',
        ]);
    }

    public function destroy(Staff $staff): JsonResponse
    {
        $staff->update(['is_active' => false]);

        return response()->json([
            'message' => 'Empleado desactivado.',
        ]);
    }

    public function storePayment(StoreStaffPaymentRequest $request, Staff $staff): JsonResponse
    {
        $payment = $staff->payments()->create([
            ...$request->validated(),
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data'    => new StaffPaymentResource($payment->load('recorder')),
            'message' => 'Pago a empleado registrado.',
        ], 201);
    }

    public function payments(Staff $staff): JsonResponse
    {
        $payments = $staff->payments()
            ->with('recorder')
            ->latest('payment_date')
            ->paginate(20);

        return response()->json([
            'data' => StaffPaymentResource::collection($payments),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'per_page'     => $payments->perPage(),
                'total'        => $payments->total(),
            ],
        ]);
    }

    public function paymentsSummary(Request $request): JsonResponse
    {
        $year = $request->integer('year', now()->year);

        $summary = StaffPayment::query()
            ->whereYear('payment_date', $year)
            ->selectRaw('MONTH(payment_date) as month, SUM(amount) as total, COUNT(*) as count')
            ->groupByRaw('MONTH(payment_date)')
            ->orderBy('month')
            ->get();

        return response()->json([
            'data' => [
                'year'  => $year,
                'months' => $summary,
                'total'  => $summary->sum('total'),
            ],
        ]);
    }
}
