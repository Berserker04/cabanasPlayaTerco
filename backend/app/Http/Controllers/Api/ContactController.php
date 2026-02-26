<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContactRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;

class ContactController extends Controller
{
    public function store(ContactRequest $request): JsonResponse
    {
        $lead = Lead::create([
            'name'          => $request->name,
            'email'         => $request->email,
            'phone'         => $request->phone,
            'source'        => \App\Enums\LeadSource::Website,
            'status'        => \App\Enums\LeadStatus::New,
            'message'       => $request->message,
            'check_in'      => $request->check_in,
            'check_out'     => $request->check_out,
            'guests_count'  => $request->guests_count,
            'cabin_type_id' => $request->cabin_type_id,
        ]);

        return response()->json([
            'data'    => new LeadResource($lead),
            'message' => 'Tu mensaje ha sido enviado. Te contactaremos pronto.',
        ], 201);
    }
}
