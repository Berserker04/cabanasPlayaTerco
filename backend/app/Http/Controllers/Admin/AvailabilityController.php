<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CabinAvailabilityResource;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'check_in'  => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests'    => ['nullable', 'integer', 'min:1'],
        ]);

        $availability = $this->availabilityService->checkAvailability(
            $request->check_in,
            $request->check_out,
            $request->integer('guests'),
            admin: true,
        );

        return response()->json([
            'data' => [
                'check_in'         => $availability['check_in'],
                'check_out'        => $availability['check_out'],
                'guests'           => $availability['guests'],
                'cabins'           => CabinAvailabilityResource::collection($availability['cabins']),
                'available_cabins' => CabinAvailabilityResource::collection($availability['available_cabins']),
                'summary'          => $availability['summary'],
                'message'          => $availability['message'],
            ],
        ]);
    }
}
