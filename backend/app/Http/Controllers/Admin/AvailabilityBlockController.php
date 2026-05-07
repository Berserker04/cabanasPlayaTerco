<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAvailabilityBlockRequest;
use App\Http\Requests\Admin\UpdateAvailabilityBlockRequest;
use App\Http\Resources\AvailabilityBlockResource;
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AvailabilityBlockController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
            'cabin_id' => ['nullable', 'exists:cabins,id'],
        ]);

        $blocks = AvailabilityBlock::query()
            ->with(['cabins', 'creator'])
            ->when($request->filled('from'), fn ($query) => $query->where('check_out', '>', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->where('check_in', '<', $request->date('to')))
            ->when($request->filled('cabin_id'), function ($query) use ($request) {
                $query->where(function ($query) use ($request) {
                    $query->where('applies_to_all', true)
                        ->orWhereHas('cabins', fn ($cabinQuery) => $cabinQuery->whereKey($request->integer('cabin_id')));
                });
            })
            ->orderBy('check_in')
            ->paginate(30);

        return response()->json([
            'data' => AvailabilityBlockResource::collection($blocks),
            'meta' => [
                'current_page' => $blocks->currentPage(),
                'last_page'    => $blocks->lastPage(),
                'per_page'     => $blocks->perPage(),
                'total'        => $blocks->total(),
            ],
        ]);
    }

    public function store(StoreAvailabilityBlockRequest $request): JsonResponse
    {
        $data = $request->validated();
        $cabinIds = $this->targetCabinIds($data);

        $this->ensureTargetsAvailable($data['check_in'], $data['check_out'], $cabinIds);

        $block = DB::transaction(function () use ($data, $cabinIds, $request): AvailabilityBlock {
            unset($data['cabin_ids']);
            $data['created_by'] = $request->user()->id;

            $block = AvailabilityBlock::create($data);
            $block->cabins()->sync(($data['applies_to_all'] ?? false) ? [] : $cabinIds);

            return $block;
        });

        return response()->json([
            'data'    => new AvailabilityBlockResource($block->load(['cabins', 'creator'])),
            'message' => 'Bloqueo de disponibilidad creado.',
        ], 201);
    }

    public function show(AvailabilityBlock $availabilityBlock): JsonResponse
    {
        return response()->json([
            'data' => new AvailabilityBlockResource($availabilityBlock->load(['cabins', 'creator'])),
        ]);
    }

    public function update(UpdateAvailabilityBlockRequest $request, AvailabilityBlock $availabilityBlock): JsonResponse
    {
        $data = $request->validated();
        $merged = [
            'check_in'       => $data['check_in'] ?? $availabilityBlock->check_in->format('Y-m-d'),
            'check_out'      => $data['check_out'] ?? $availabilityBlock->check_out->format('Y-m-d'),
            'applies_to_all' => $data['applies_to_all'] ?? $availabilityBlock->applies_to_all,
            'cabin_ids'      => $data['cabin_ids'] ?? $availabilityBlock->cabins()->pluck('cabins.id')->all(),
        ];
        $cabinIds = $this->targetCabinIds($merged);

        $this->ensureTargetsAvailable(
            $merged['check_in'],
            $merged['check_out'],
            $cabinIds,
            ignoreBlockId: $availabilityBlock->id,
        );

        DB::transaction(function () use ($data, $merged, $cabinIds, $availabilityBlock): void {
            unset($data['cabin_ids']);
            $data['applies_to_all'] = $merged['applies_to_all'];

            $availabilityBlock->update($data);
            $availabilityBlock->cabins()->sync($merged['applies_to_all'] ? [] : $cabinIds);
        });

        return response()->json([
            'data'    => new AvailabilityBlockResource($availabilityBlock->fresh()->load(['cabins', 'creator'])),
            'message' => 'Bloqueo de disponibilidad actualizado.',
        ]);
    }

    public function destroy(AvailabilityBlock $availabilityBlock): JsonResponse
    {
        $availabilityBlock->delete();

        return response()->json([
            'message' => 'Bloqueo de disponibilidad eliminado.',
        ]);
    }

    private function targetCabinIds(array $data): array
    {
        if ($data['applies_to_all'] ?? false) {
            return Cabin::query()
                ->whereNotNull('map_slot')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return collect($data['cabin_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function ensureTargetsAvailable(
        string $checkIn,
        string $checkOut,
        array $cabinIds,
        ?int $ignoreBlockId = null,
    ): void {
        $unavailable = $this->availabilityService->unavailableCabinIdsForRange(
            checkIn: $checkIn,
            checkOut: $checkOut,
            cabinIds: $cabinIds,
            ignoreBlockId: $ignoreBlockId,
            includeCabinStatus: false,
        );

        if ($unavailable->isEmpty()) {
            return;
        }

        throw ValidationException::withMessages([
            'cabin_ids' => ['Una o mas cabanas ya tienen reserva, mantenimiento o bloqueo para esas fechas.'],
        ]);
    }
}
