<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateGuestMemberRequest;
use App\Http\Resources\GuestMemberResource;
use App\Models\GuestMember;
use Illuminate\Http\JsonResponse;

class GuestMemberController extends Controller
{
    public function update(UpdateGuestMemberRequest $request, GuestMember $guestMember): JsonResponse
    {
        $guestMember->update($request->validated());

        return response()->json([
            'data'    => new GuestMemberResource($guestMember->fresh()),
            'message' => 'Miembro actualizado.',
        ]);
    }

    public function destroy(GuestMember $guestMember): JsonResponse
    {
        $guestMember->delete();

        return response()->json([
            'message' => 'Miembro eliminado del grupo.',
        ]);
    }
}
