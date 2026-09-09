<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreReservationRequest;
use App\Http\Requests\Admin\UpdateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Cabin;
use App\Models\Reservation;
use App\Services\AvailabilityService;
use Carbon\Carbon;
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
            ->with(['cabin.type', 'cabins.type', 'user', 'guestGroup', 'assignedStaff'])
            ->withSum([
                'payments as total_paid' => fn ($query) => $query->whereIn('status', [
                    PaymentStatus::Completed->value,
                    PaymentStatus::Partial->value,
                ]),
            ], 'amount')
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
                'per_page' => $reservations->perPage(),
                'total' => $reservations->total(),
            ],
        ]);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $cabinIds = $this->normalizeCabinIds($data);

        $reservation = DB::transaction(function () use ($data, $cabinIds, $request): Reservation {
            $this->lockCabins($cabinIds);
            $this->ensureCabinsAvailable(
                checkIn: $data['check_in'],
                checkOut: $data['check_out'],
                cabinIds: $cabinIds,
            );

            unset($data['cabin_ids']);
            $payload = $this->applyLifecycleDefaults($data);
            $payload['cabin_id'] = $cabinIds[0];
            $payload['created_by'] = $request->user()->id;

            $reservation = Reservation::create($payload);
            $reservation->cabins()->sync($cabinIds);

            return $reservation;
        });

        return response()->json([
            'data' => new ReservationResource($reservation->load('cabin.type', 'cabins.type')),
            'message' => 'Reserva creada.',
        ], 201);
    }

    public function show(Reservation $reservation): JsonResponse
    {
        $reservation->load(['cabin.type', 'cabins.type', 'user', 'guestGroup', 'assignedStaff', 'payments.recorder']);
        $reservation->loadSum([
            'payments as total_paid' => fn ($query) => $query->whereIn('status', [
                PaymentStatus::Completed->value,
                PaymentStatus::Partial->value,
            ]),
        ], 'amount');

        return response()->json([
            'data' => new ReservationResource($reservation),
        ]);
    }

    public function update(UpdateReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $reservation): void {
            $reservation = Reservation::query()->lockForUpdate()->findOrFail($reservation->id);
            $cabinIds = $this->normalizeCabinIds($data, $reservation);
            // Serialize assignments with cabin deletion, including cancelled reservations.
            $this->lockCabins($cabinIds);
            $newCabinIds = array_diff($cabinIds, $this->normalizeCabinIds([], $reservation));
            if (Cabin::onlyTrashed()->whereIn('id', $newCabinIds)->exists()) {
                throw ValidationException::withMessages([
                    'cabin_ids' => ['No se puede añadir una cabaña eliminada a una reserva.'],
                ]);
            }
            $checkIn = $data['check_in'] ?? $reservation->check_in->format('Y-m-d');
            $checkOut = $data['check_out'] ?? $reservation->check_out->format('Y-m-d');
            $targetStatus = ReservationStatus::from(
                $data['status'] ?? $reservation->status->value
            );

            if (
                $targetStatus->blocksAvailability()
                || ($targetStatus === ReservationStatus::Pending
                    && $this->reservationPlacementChanges($reservation, $checkIn, $checkOut, $cabinIds))
            ) {
                $this->ensureCabinsAvailable(
                    checkIn: $checkIn,
                    checkOut: $checkOut,
                    cabinIds: $cabinIds,
                    ignoreReservationId: $reservation->id,
                );
            }

            unset($data['cabin_ids']);
            $payload = $this->applyLifecycleDefaults($data, $reservation);
            $payload['cabin_id'] = $cabinIds[0];

            $reservation->update($payload);
            $reservation->cabins()->sync($cabinIds);
        });

        return response()->json([
            'data' => new ReservationResource($reservation->fresh()->load('cabin.type', 'cabins.type', 'user', 'guestGroup', 'assignedStaff')),
            'message' => 'Reserva actualizada.',
        ]);
    }

    public function destroy(Reservation $reservation): JsonResponse
    {
        $reservation->update(['status' => ReservationStatus::Cancelled]);

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
        $start = \Carbon\Carbon::parse($month.'-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $reservations = Reservation::query()
            ->with(['cabin.type', 'cabins.type', 'assignedStaff'])
            ->blockingAvailability()
            ->where('check_in', '<=', $end)
            ->where('check_out', '>', $start)
            ->get();

        return response()->json([
            'data' => [
                'month' => $month,
                'reservations' => ReservationResource::collection($reservations),
                'total' => $reservations->count(),
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

    private function reservationPlacementChanges(
        Reservation $reservation,
        string $checkIn,
        string $checkOut,
        array $cabinIds,
    ): bool {
        $existingCabinIds = $this->normalizeCabinIds([], $reservation);
        sort($existingCabinIds);
        sort($cabinIds);

        return $checkIn !== $reservation->check_in->format('Y-m-d')
            || $checkOut !== $reservation->check_out->format('Y-m-d')
            || $cabinIds !== $existingCabinIds;
    }

    private function lockCabins(array $cabinIds): void
    {
        Cabin::withTrashed()
            ->whereIn('id', $cabinIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->pluck('id');
    }

    private function applyLifecycleDefaults(array $data, ?Reservation $reservation = null): array
    {
        $status = ReservationStatus::from(
            $data['status'] ?? $reservation?->status->value ?? ReservationStatus::Pending->value
        );
        $data['status'] = $status->value;

        if ($status === ReservationStatus::Pending && ! array_key_exists('expires_at', $data)) {
            $shouldCreateDefaultExpiry = $reservation === null
                || $reservation->status !== ReservationStatus::Pending
                || $reservation->expires_at === null
                || $reservation->expires_at->isPast();

            if ($shouldCreateDefaultExpiry) {
                $data['expires_at'] = now()->addHours(48);
            }
        }

        if ($status === ReservationStatus::Expired && ! array_key_exists('expires_at', $data)) {
            $data['expires_at'] = $reservation?->expires_at ?? now();
        }

        if (
            in_array($status, [ReservationStatus::Confirmed, ReservationStatus::CheckedIn], true)
            && $reservation?->confirmed_at === null
            && ! array_key_exists('confirmed_at', $data)
        ) {
            $data['confirmed_at'] = Carbon::now();
        }

        return $data;
    }
}
