<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService
    ) {}

    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->getStats(),
        ]);
    }

    public function operations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'between:2020,2100'],
        ]);

        return response()->json([
            'data' => $this->dashboardService->getOperationalStats(
                isset($validated['year']) ? (int) $validated['year'] : null
            ),
        ]);
    }
}
