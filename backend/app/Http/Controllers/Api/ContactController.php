<?php

namespace App\Http\Controllers\Api;

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ContactRequest;
use App\Mail\ContactLeadAutoresponse;
use App\Mail\ContactLeadNotification;
use App\Models\Cabin;
use App\Models\Lead;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class ContactController extends Controller
{
    public function __construct(
        private readonly PushNotificationService $pushNotificationService
    ) {}

    public function store(ContactRequest $request): JsonResponse
    {
        $lead = DB::transaction(function () use ($request): Lead {
            $cabin = $request->filled('cabin_id')
                ? Cabin::visible()->lockForUpdate()->find($request->integer('cabin_id'))
                : null;

            if ($request->filled('cabin_id') && ! $cabin) {
                throw ValidationException::withMessages(['cabin_id' => 'Esta cabaña ya no está publicada. Selecciona otra o deja la cabaña por definir.']);
            }

            return Lead::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'source' => LeadSource::Website,
                'status' => LeadStatus::New,
                'message' => $request->message,
                'check_in' => $request->check_in,
                'check_out' => $request->check_out,
                'guests_count' => $request->guests_count,
                'cabin_id' => $cabin?->id,
                'cabin_type_id' => $cabin?->cabin_type_id ?? $request->cabin_type_id,
            ]);

        });

        $lead->load(['cabin', 'cabinType']);
        try {
            $this->pushNotificationService->notifyStaffOfNewLead($lead);
        } catch (Throwable $exception) {
            Log::warning('Contact push delivery failed.', ['lead_id' => $lead->id]);
        }

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
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'data' => ['id' => $lead->id, 'name' => $lead->name, 'email' => $lead->email, 'cabin_id' => $lead->cabin_id],
            'message' => $message,
            'meta' => [
                'email_sent' => $emailSent,
            ],
        ], 201);
    }
}
