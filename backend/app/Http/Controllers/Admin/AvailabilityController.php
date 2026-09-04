<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CabinAvailabilityResource;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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

    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'year'  => ['nullable', 'integer', 'min:2020', 'max:2100'],
        ]);

        $calendar = $this->availabilityService->getAdminCalendar(
            month: $request->string('month')->toString() ?: null,
            year: $request->integer('year') ?: null,
        );

        return response()->json([
            'data' => $calendar,
        ]);
    }

    public function planner(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'check_in'  => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests'    => ['nullable', 'integer', 'min:1'],
        ]);

        if (Carbon::parse($validated['check_in'])->diffInDays(Carbon::parse($validated['check_out'])) > 31) {
            throw ValidationException::withMessages([
                'check_out' => ['El rango de consulta no puede superar 31 dias.'],
            ]);
        }

        return response()->json([
            'data' => $this->availabilityService->getPlanner(
                $validated['check_in'],
                $validated['check_out'],
                $request->integer('guests') ?: null,
            ),
        ]);
    }
}
