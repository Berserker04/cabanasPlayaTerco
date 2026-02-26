<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $leads = Lead::query()
            ->with(['cabinType', 'assignee'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->source, fn ($q, $s) => $q->where('source', $s))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => LeadResource::collection($leads),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'per_page'     => $leads->perPage(),
                'total'        => $leads->total(),
            ],
        ]);
    }

    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['status']) && $data['status'] !== $lead->status->value && ! $lead->responded_at) {
            $data['responded_at'] = now();
        }

        $lead->update($data);

        return response()->json([
            'data'    => new LeadResource($lead->fresh()->load('cabinType', 'assignee')),
            'message' => 'Lead actualizado.',
        ]);
    }
}
