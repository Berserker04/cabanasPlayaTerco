<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexUsersRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\UserAdministrationService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly UserAdministrationService $userAdministrationService,
    ) {}

    public function index(IndexUsersRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $perPage = $filters['per_page'] ?? 20;

        $users = User::query()
            ->with('roles')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($searchQuery) use ($search): void {
                    $searchQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when(
                $filters['role'] ?? null,
                fn ($query, string $role) => $query->whereHas(
                    'roles',
                    fn ($roleQuery) => $roleQuery->where('roles.name', $role),
                ),
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status),
            )
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $availableRoles = Role::query()
            ->orderBy('id')
            ->get(['id', 'name', 'display_name', 'description'])
            ->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
            ])
            ->values();

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
                'available_roles' => $availableRoles,
                'counts' => [
                    'total' => User::query()->count(),
                    'active' => User::query()->where('status', UserStatus::Active)->count(),
                    'suspended' => User::query()->where('status', UserStatus::Suspended)->count(),
                    'active_admins' => User::query()
                        ->where('status', UserStatus::Active)
                        ->whereHas('roles', fn ($query) => $query->where('roles.name', 'admin'))
                        ->count(),
                ],
            ],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $updatedUser = $this->userAdministrationService->update(
            $request->user(),
            $user,
            $request->validated(),
        );

        return response()->json([
            'data'    => new UserResource($updatedUser),
            'message' => 'Usuario actualizado.',
        ]);
    }
}
