<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinRequest;
use App\Http\Requests\Admin\UpdateCabinRequest;
use App\Http\Resources\CabinResource;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CabinController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $cabins = Cabin::query()
            ->with([
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
            ->paginate(30);

        return response()->json([
            'data' => CabinResource::collection($cabins),
            'meta' => [
                'current_page' => $cabins->currentPage(),
                'last_page'    => $cabins->lastPage(),
                'per_page'     => $cabins->perPage(),
                'total'        => $cabins->total(),
            ],
        ]);
    }

    public function store(StoreCabinRequest $request): JsonResponse
    {
        $data = $this->preparePayload($request->validated());
        $cabin = Cabin::create($data);

        return response()->json([
            'data'    => new CabinResource($this->loadForResponse($cabin)),
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
        $cabin->update($this->preparePayload($request->validated(), $cabin));

        return response()->json([
            'data'    => new CabinResource($this->loadForResponse($cabin->fresh())),
            'message' => 'Cabaña actualizada.',
        ]);
    }

    public function uploadCover(Request $request, Cabin $cabin): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $upload = $this->uploadService->upload($request->file('file'), 'cabins/covers');

        if ($cabin->cover_image_path) {
            $this->uploadService->delete($cabin->cover_image_path);
        }

        $cabin->update([
            'cover_image'      => $upload['url'],
            'cover_image_path' => $upload['path'],
        ]);

        return response()->json([
            'data'    => new CabinResource($this->loadForResponse($cabin->fresh())),
            'message' => 'Portada actualizada.',
        ]);
    }

    public function destroy(Cabin $cabin): JsonResponse
    {
        $cabin->delete();

        return response()->json([
            'message' => 'Cabaña eliminada.',
        ]);
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
            $source = $data['slug'] ?? $cabin?->slug ?? $data['name'] ?? $cabin?->name ?? Str::uuid()->toString();
            $data['code'] = Str::upper(Str::limit(Str::slug($source), 50, ''));
        }

        return $data;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'cabana';
        $slug = $base;
        $suffix = 2;

        while (Cabin::where('slug', $slug)->exists()) {
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
                'name'              => 'Cabaña Playa Terco',
                'description'       => 'Tipo interno para las cabañas fisicas de Playa Terco.',
                'short_description' => 'Tipo interno.',
                'base_price'        => 0,
                'max_guests'        => 1,
                'bedrooms'          => 0,
                'bathrooms'         => 0,
                'is_active'         => false,
                'sort_order'        => 0,
            ],
        )->id;
    }

    private function loadForResponse(Cabin $cabin): Cabin
    {
        return $cabin->load([
            'type',
            'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
        ]);
    }
}
