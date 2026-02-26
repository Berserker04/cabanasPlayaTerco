<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CabinResource;
use App\Services\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService
    ) {}

    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'check_in'  => ['required', 'date', 'after_or_equal:today'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests'    => ['nullable', 'integer', 'min:1'],
        ]);

        $cabins = $this->availabilityService->checkAvailability(
            $request->check_in,
            $request->check_out,
            $request->integer('guests'),
        );

        return response()->json([
            'data' => CabinResource::collection($cabins),
        ]);
    }

    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'month'         => ['required', 'date_format:Y-m'],
            'cabin_type_id' => ['nullable', 'exists:cabin_types,id'],
        ]);

        $calendar = $this->availabilityService->getCalendar(
            $request->month,
            $request->integer('cabin_type_id') ?: null,
        );

        return response()->json([
            'data' => $calendar,
        ]);
    }
}
