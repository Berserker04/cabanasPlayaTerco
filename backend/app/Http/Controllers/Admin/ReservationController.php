<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreReservationRequest;
use App\Http\Requests\Admin\UpdateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $reservations = Reservation::query()
            ->with(['cabin.type', 'cabins.type', 'user', 'guestGroup'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->cabin_id, function ($q, $id) {
                $q->where('cabin_id', $id)
                    ->orWhereHas('cabins', fn ($cabinQuery) => $cabinQuery->where('cabins.id', $id));
            })
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
        $data = $request->validated();
        $cabinIds = $this->normalizeCabinIds($data);

        $this->ensureCabinsAvailable(
            checkIn: $data['check_in'],
            checkOut: $data['check_out'],
            cabinIds: $cabinIds,
        );

        $reservation = DB::transaction(function () use ($data, $cabinIds, $request): Reservation {
            unset($data['cabin_ids']);
            $data['cabin_id'] = $cabinIds[0];
            $data['status'] ??= ReservationStatus::Pending->value;
            $data['created_by'] = $request->user()->id;

            $reservation = Reservation::create($data);
            $reservation->cabins()->sync($cabinIds);

            return $reservation;
        });

        return response()->json([
            'data'    => new ReservationResource($reservation->load('cabin.type', 'cabins.type')),
            'message' => 'Reserva creada.',
        ], 201);
    }

    public function update(UpdateReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $data = $request->validated();
        $cabinIds = $this->normalizeCabinIds($data, $reservation);
        $checkIn = $data['check_in'] ?? $reservation->check_in->format('Y-m-d');
        $checkOut = $data['check_out'] ?? $reservation->check_out->format('Y-m-d');

        $this->ensureCabinsAvailable(
            checkIn: $checkIn,
            checkOut: $checkOut,
            cabinIds: $cabinIds,
            ignoreReservationId: $reservation->id,
        );

        DB::transaction(function () use ($data, $cabinIds, $reservation): void {
            unset($data['cabin_ids']);
            $data['cabin_id'] = $cabinIds[0];

            $reservation->update($data);
            $reservation->cabins()->sync($cabinIds);
        });

        return response()->json([
            'data'    => new ReservationResource($reservation->fresh()->load('cabin.type', 'cabins.type', 'user', 'guestGroup')),
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
            ->with(['cabin.type', 'cabins.type'])
            ->active()
            ->where('check_in', '<=', $end)
            ->where('check_out', '>', $start)
            ->get();

        return response()->json([
            'data' => [
                'month'        => $month,
                'reservations' => ReservationResource::collection($reservations),
                'total'        => $reservations->count(),
            ],
        ]);
    }

    private function normalizeCabinIds(array $data, ?Reservation $reservation = null): array
    {
        if (isset($data['cabin_ids'])) {
            return collect($data['cabin_ids'])
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        if (isset($data['cabin_id'])) {
            return [(int) $data['cabin_id']];
        }

        if ($reservation) {
            $existing = $reservation->cabins()->pluck('cabins.id');

            if ($existing->isNotEmpty()) {
                return $existing->map(fn ($id) => (int) $id)->values()->all();
            }

            if ($reservation->cabin_id) {
                return [(int) $reservation->cabin_id];
            }
        }

        return [];
    }

    private function ensureCabinsAvailable(
        string $checkIn,
        string $checkOut,
        array $cabinIds,
        ?int $ignoreReservationId = null,
    ): void {
        $unavailable = $this->availabilityService->unavailableCabinIdsForRange(
            checkIn: $checkIn,
            checkOut: $checkOut,
            cabinIds: $cabinIds,
            ignoreReservationId: $ignoreReservationId,
        );

        if ($unavailable->isEmpty()) {
            return;
        }

        throw ValidationException::withMessages([
            'cabin_ids' => ['Una o mas cabanas seleccionadas no estan disponibles para esas fechas.'],
        ]);
    }
}
