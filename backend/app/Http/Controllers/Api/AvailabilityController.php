<?php

namespace App\Http\Controllers\Api;

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

    public function check(Request $request): JsonResponse
    {
        $request->validate([
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.now(config('app.business_timezone'))->toDateString()],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'guests' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $availability = $this->availabilityService->checkAvailability(
            $request->check_in,
            $request->check_out,
            $request->integer('guests'),
        );

        return response()->json([
            'data' => [
                'check_in' => $availability['check_in'],
                'check_out' => $availability['check_out'],
                'guests' => $availability['guests'],
                'cabins' => CabinAvailabilityResource::collection($availability['cabins']),
                'available_cabins' => CabinAvailabilityResource::collection($availability['available_cabins']),
                'summary' => $availability['summary'],
                'message' => $availability['message'],
            ],
        ]);
    }

    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'month' => ['required', 'date_format:Y-m'],
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
