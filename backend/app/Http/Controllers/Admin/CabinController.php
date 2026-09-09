<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinRequest;
use App\Http\Requests\Admin\UpdateCabinRequest;
use App\Http\Resources\CabinResource;
use App\Models\Cabin;
use App\Models\CabinMapPoint;
use App\Models\CabinType;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CabinController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'trashed' => ['sometimes', 'in:without,only,with'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'status' => ['sometimes', 'in:available,occupied,maintenance,inactive'],
            'is_active' => ['sometimes', 'in:true,false,1,0'],
        ]);
        $cabins = Cabin::query()
            ->when($request->input('trashed') === 'only', fn ($query) => $query->onlyTrashed())
            ->when($request->input('trashed') === 'with', fn ($query) => $query->withTrashed())
            ->with([
                'mapPoint',
                'type',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('map_slot'), fn ($query) => $query->where('map_slot', $request->string('map_slot')))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'data' => CabinResource::collection($cabins),
            'meta' => [
                'current_page' => $cabins->currentPage(),
                'last_page' => $cabins->lastPage(),
                'per_page' => $cabins->perPage(),
                'total' => $cabins->total(),
            ],
            'summary' => [
                'total' => Cabin::count(),
                'public' => Cabin::visible()->count(),
                'available' => Cabin::available()->count(),
                'deleted' => Cabin::onlyTrashed()->count(),
            ],
        ]);
    }

    public function store(StoreCabinRequest $request): JsonResponse
    {
        $cabin = DB::transaction(function () use ($request): Cabin {
            $data = $this->preparePayload($request->validated());
            $this->reservePoint($data['map_slot']);

            return Cabin::create($data);
        });

        return response()->json([
            'data' => new CabinResource($this->loadForResponse($cabin)),
            'message' => 'Cabaña creada.',
        ], 201);
    }

    public function show(Cabin $cabin): JsonResponse
    {
        return response()->json([
            'data' => new CabinResource($this->loadForResponse($cabin)),
        ]);
    }

    public function update(UpdateCabinRequest $request, Cabin $cabin): JsonResponse
    {
        DB::transaction(function () use ($request, $cabin): void {
            $data = $this->preparePayload($request->validated(), $cabin);
            if (isset($data['map_slot'])) {
                $this->reservePoint($data['map_slot'], $cabin->id);
            }
            $cabin->update($data);
        });

        return response()->json([
            'data' => new CabinResource($this->loadForResponse($cabin->fresh())),
            'message' => 'Cabaña actualizada.',
        ]);
    }

    public function uploadCover(Request $request, Cabin $cabin): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $upload = $this->uploadService->upload($request->file('file'), 'cabins/covers');

        $previousPath = $cabin->cover_image_path;
        try {
            $cabin->update(['cover_image' => $upload['url'], 'cover_image_path' => $upload['path']]);
        } catch (\Throwable $exception) {
            $this->uploadService->delete($upload['path']);
            throw $exception;
        }
        if ($previousPath) {
            $this->uploadService->delete($previousPath);
        }

        return response()->json([
            'data' => new CabinResource($this->loadForResponse($cabin->fresh())),
            'message' => 'Portada actualizada.',
        ]);
    }

    public function destroy(Cabin $cabin): JsonResponse
    {
        DB::transaction(fn () => Cabin::lockForUpdate()->findOrFail($cabin->id)->delete());

        return response()->json([
            'message' => 'Cabaña eliminada.',
        ]);
    }

    public function restore(int $id): JsonResponse
    {
        $cabin = DB::transaction(function () use ($id): Cabin {
            $cabin = Cabin::onlyTrashed()->lockForUpdate()->findOrFail($id);
            $cabin->is_active = false;
            $cabin->restore();

            return $cabin;
        });

        return response()->json(['data' => new CabinResource($this->loadForResponse($cabin)), 'message' => 'Cabaña restaurada. La ficha permanece oculta hasta publicarla.']);
    }

    public function deleteCover(Cabin $cabin): JsonResponse
    {
        $path = $cabin->cover_image_path;
        $cabin->update(['cover_image' => null, 'cover_image_path' => null]);
        if ($path) {
            $this->uploadService->delete($path);
        }

        return response()->json(['data' => new CabinResource($this->loadForResponse($cabin)), 'message' => 'Portada retirada.']);
    }

    private function reservePoint(string $key, ?int $cabinId = null): void
    {
        CabinMapPoint::where('key', $key)->lockForUpdate()->firstOrFail();
        // A locking read sees the winner even under MySQL REPEATABLE READ.
        if (Cabin::withTrashed()->where('map_slot', $key)->when($cabinId, fn ($query) => $query->whereKeyNot($cabinId))->lockForUpdate()->first(['id'])) {
            throw ValidationException::withMessages(['map_slot' => 'Este punto ya está reservado para otra cabaña.']);
        }
    }

    private function preparePayload(array $data, ?Cabin $cabin = null): array
    {
        $data['cabin_type_id'] ??= $cabin?->cabin_type_id ?? $this->defaultCabinTypeId();
        $data['status'] ??= $cabin?->status?->value ?? 'available';
        $data['is_active'] ??= $cabin?->is_active ?? true;
        $data['sort_order'] ??= $cabin?->sort_order ?? 0;
        $data['min_guests'] ??= $cabin?->min_guests ?? 1;
        $data['slug'] ??= $cabin?->slug ?? $this->uniqueSlug($data['name'] ?? 'cabana');

        if (empty($data['code'])) {
            $data['code'] = $cabin?->code ?? 'CAB-'.Str::upper(Str::random(12));
        }

        return $data;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'cabana';
        $slug = $base;
        $suffix = 2;

        while (Cabin::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function defaultCabinTypeId(): int
    {
        return CabinType::firstOrCreate(
            ['slug' => 'cabana-playa-terco'],
            [
                'name' => 'Cabaña Playa Terco',
                'description' => 'Tipo interno para las cabañas fisicas de Playa Terco.',
                'short_description' => 'Tipo interno.',
                'base_price' => 0,
                'max_guests' => 1,
                'bedrooms' => 0,
                'bathrooms' => 0,
                'is_active' => false,
                'sort_order' => 0,
            ],
        )->id;
    }

    private function loadForResponse(Cabin $cabin): Cabin
    {
        return $cabin->load([
            'mapPoint',
            'type',
            'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
        ]);
    }
}
