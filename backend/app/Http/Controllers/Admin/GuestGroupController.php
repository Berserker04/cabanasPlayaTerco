<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGuestGroupRequest;
use App\Http\Requests\Admin\StoreGuestMemberRequest;
use App\Http\Requests\Admin\UpdateGuestGroupRequest;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\GuestGroupResource;
use App\Http\Resources\GuestMemberResource;
use App\Models\GuestGroup;
use App\Models\GuestMember;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestGroupController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $groups = GuestGroup::query()
            ->with(['reservation.cabin.type', 'reservation.cabins.type', 'members'])
            ->withCount('members')
            ->when($request->search, fn ($q, $s) => $q->where('titular_name', 'like', "%{$s}%"))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => GuestGroupResource::collection($groups),
            'meta' => [
                'current_page' => $groups->currentPage(),
                'per_page'     => $groups->perPage(),
                'total'        => $groups->total(),
            ],
        ]);
    }

    public function store(StoreGuestGroupRequest $request): JsonResponse
    {
        $group = GuestGroup::create($request->validated());

        return response()->json([
            'data'    => new GuestGroupResource($group->load('reservation')),
            'message' => 'Grupo de huéspedes creado.',
        ], 201);
    }

    public function show(GuestGroup $guestGroup): JsonResponse
    {
        $guestGroup->load(['reservation.cabin.type', 'reservation.cabins.type', 'members', 'documents', 'payments']);

        return response()->json([
            'data' => new GuestGroupResource($guestGroup),
        ]);
    }

    public function update(UpdateGuestGroupRequest $request, GuestGroup $guestGroup): JsonResponse
    {
        $guestGroup->update($request->validated());

        return response()->json([
            'data'    => new GuestGroupResource($guestGroup->fresh()->load('members')),
            'message' => 'Grupo actualizado.',
        ]);
    }

    public function addMember(StoreGuestMemberRequest $request, GuestGroup $guestGroup): JsonResponse
    {
        $member = $guestGroup->members()->create($request->validated());

        return response()->json([
            'data'    => new GuestMemberResource($member),
            'message' => 'Miembro agregado al grupo.',
        ], 201);
    }

    public function uploadDocument(Request $request, GuestGroup $guestGroup): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'type' => ['required', 'string'],
        ]);

        $upload = $this->uploadService->upload($request->file('file'), 'documents');

        $document = $guestGroup->documents()->create([
            'type'          => $request->type,
            'url'           => $upload['url'],
            'path'          => $upload['path'],
            'original_name' => $upload['original_name'],
            'mime_type'     => $upload['mime_type'],
            'size_bytes'    => $upload['size_bytes'],
            'uploaded_by'   => $request->user()->id,
        ]);

        return response()->json([
            'data'    => new DocumentResource($document),
            'message' => 'Documento subido.',
        ], 201);
    }

    public function export(Request $request): JsonResponse
    {
        // TODO: Implement export to Excel/PDF using barryvdh/laravel-dompdf
        return response()->json([
            'message' => 'Funcionalidad de exportación pendiente.',
        ], 501);
    }
}
