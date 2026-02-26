<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

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
}
