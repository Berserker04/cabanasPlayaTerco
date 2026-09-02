<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\Lead;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function notifyStaffOfNewLead(Lead $lead): void
    {
        $tokens = DeviceToken::query()
            ->whereHas('user.roles', fn ($query) => $query->whereIn('name', ['admin', 'staff']))
            ->pluck('token')
            ->filter()
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $this->send(
            tokens: $tokens->all(),
            title: 'Nuevo contacto recibido',
            body: $lead->name . ($lead->check_in ? " pregunto por {$lead->check_in->format('Y-m-d')}" : ' escribio desde la web'),
            data: [
                'type' => 'lead.created',
                'lead_id' => (string) $lead->id,
            ],
        );
    }

    public function send(array $tokens, string $title, string $body, array $data = []): void
    {
        $serverKey = config('services.firebase.server_key');

        if (! $serverKey) {
            Log::info('Push notification skipped because Firebase is not configured.', [
                'title' => $title,
                'tokens_count' => count($tokens),
                'data' => $data,
            ]);

            return;
        }

        $response = Http::withHeaders([
            'Authorization' => 'key=' . $serverKey,
            'Content-Type' => 'application/json',
        ])->post('https://fcm.googleapis.com/fcm/send', [
            'registration_ids' => array_values($tokens),
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => $data,
        ]);

        if ($response->failed()) {
            Log::warning('Firebase push notification failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
