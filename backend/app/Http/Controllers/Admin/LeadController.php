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
        $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', \Illuminate\Validation\Rule::enum(\App\Enums\LeadStatus::class)],
            'source' => ['nullable', \Illuminate\Validation\Rule::enum(\App\Enums\LeadSource::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $leads = Lead::query()
            ->with(['cabin', 'cabinType', 'assignee'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->source, fn ($q, $s) => $q->where('source', $s))
            ->when($request->filled('search'), fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('email', 'like', '%'.$request->search.'%')
                ->orWhere('phone', 'like', '%'.$request->search.'%')))
            ->latest()
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => LeadResource::collection($leads),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'new_count' => Lead::where('status', 'new')->count(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
        ]);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json(['data' => new LeadResource($lead->load(['cabin', 'cabinType', 'assignee']))]);
    }

    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['status']) && $data['status'] !== $lead->status->value && ! $lead->responded_at) {
            $data['responded_at'] = now();
        }

        $lead->update($data);

        return response()->json([
            'data' => new LeadResource($lead->fresh()->load('cabin', 'cabinType', 'assignee')),
            'message' => 'Solicitud de cotización actualizada.',
        ]);
    }
}
