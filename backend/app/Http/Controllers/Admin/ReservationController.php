<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreReservationRequest;
use App\Http\Requests\Admin\UpdateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reservations = Reservation::query()
            ->with(['cabin.type', 'user', 'guestGroup'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->cabin_id, fn ($q, $id) => $q->where('cabin_id', $id))
            ->when($request->from, fn ($q, $d) => $q->where('check_in', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->where('check_out', '<=', $d))
            ->latest('check_in')
            ->paginate(20);

        return response()->json([
            'data' => ReservationResource::collection($reservations),
            'meta' => [
                'current_page' => $reservations->currentPage(),
                'per_page'     => $reservations->perPage(),
                'total'        => $reservations->total(),
            ],
        ]);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = Reservation::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data'    => new ReservationResource($reservation->load('cabin.type')),
            'message' => 'Reserva creada.',
        ], 201);
    }

    public function update(UpdateReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $reservation->update($request->validated());

        return response()->json([
            'data'    => new ReservationResource($reservation->fresh()->load('cabin.type', 'user', 'guestGroup')),
            'message' => 'Reserva actualizada.',
        ]);
    }

    public function destroy(Reservation $reservation): JsonResponse
    {
        $reservation->update(['status' => \App\Enums\ReservationStatus::Cancelled]);

        return response()->json([
            'message' => 'Reserva cancelada.',
        ]);
    }

    public function occupancy(Request $request): JsonResponse
    {
        $request->validate([
            'month' => ['required', 'date_format:Y-m'],
        ]);

        $month = $request->month;
        $start = \Carbon\Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $reservations = Reservation::query()
            ->with('cabin.type')
            ->active()
            ->where('check_in', '<=', $end)
            ->where('check_out', '>=', $start)
            ->get();

        return response()->json([
            'data' => [
                'month'        => $month,
                'reservations' => ReservationResource::collection($reservations),
                'total'        => $reservations->count(),
            ],
        ]);
    }
}
