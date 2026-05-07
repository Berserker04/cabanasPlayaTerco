<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContactRequest;
use App\Mail\ContactLeadAutoresponse;
use App\Mail\ContactLeadNotification;
use App\Http\Resources\LeadResource;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Models\Cabin;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ContactController extends Controller
{
    public function store(ContactRequest $request): JsonResponse
    {
        $cabin = $request->filled('cabin_id')
            ? Cabin::find($request->integer('cabin_id'))
            : null;

        $lead = Lead::create([
            'name'          => $request->name,
            'email'         => $request->email,
            'phone'         => $request->phone,
            'source'        => LeadSource::Website,
            'status'        => LeadStatus::New,
            'message'       => $request->message,
            'check_in'      => $request->check_in,
            'check_out'     => $request->check_out,
            'guests_count'  => $request->guests_count,
            'cabin_id'      => $cabin?->id,
            'cabin_type_id' => $cabin?->cabin_type_id ?? $request->cabin_type_id,
        ]);

        $lead->load(['cabin', 'cabinType']);

        $emailSent = true;
        $message = 'Tu mensaje ha sido enviado. Te contactaremos pronto.';

        try {
            Mail::to(config('mail.contact.to'))
                ->send(new ContactLeadNotification($lead));

            Mail::to($lead->email)
                ->send(new ContactLeadAutoresponse($lead));
        } catch (Throwable $exception) {
            $emailSent = false;
            $message = 'Recibimos tu solicitud y la guardamos. Tuvimos un problema enviando la confirmación por correo; si necesitas respuesta inmediata, escríbenos por WhatsApp.';

            Log::error('Contact email delivery failed.', [
                'lead_id' => $lead->id,
                'error'   => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'data'    => new LeadResource($lead),
            'message' => $message,
            'meta'    => [
                'email_sent' => $emailSent,
            ],
        ], 201);
    }
}
