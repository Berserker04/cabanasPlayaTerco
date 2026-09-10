<?php

namespace App\Services;

use App\Jobs\SendLeadPush;
use App\Models\DeviceToken;
use App\Models\Lead;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function __construct(private readonly FirebaseAccessTokenProvider $accessTokens) {}

    public function notifyStaffOfNewLead(Lead $lead): void
    {
        DeviceToken::eligibleRecipient()->select('id')->chunkById(100, function ($devices) use ($lead): void {
            foreach ($devices as $device) {
                SendLeadPush::dispatch($lead->id, $device->id)->onConnection('database')->onQueue('push')->afterCommit();
            }
        });
    }

    public function sendToDevice(DeviceToken $device, Lead $lead): void
    {
        $project = config('services.firebase.project_id');
        if (! $project) {
            throw new \RuntimeException('FIREBASE_PROJECT_ID no está configurado.');
        }
        $response = Http::withToken($this->accessTokens->token())->acceptJson()
            ->connectTimeout(5)->timeout(12)
            ->post('https://fcm.googleapis.com/v1/projects/'.rawurlencode($project).'/messages:send', [
                'message' => [
                    'token' => $device->token,
                    'notification' => [
                        'title' => 'Nueva solicitud de cotización',
                        'body' => $lead->name.' escribió desde la web. Toca para ver su solicitud.',
                    ],
                    'data' => ['type' => 'lead.created', 'lead_id' => (string) $lead->id],
                    'android' => [
                        'priority' => 'high',
                        'notification' => ['channel_id' => 'quotations', 'tag' => 'lead-'.$lead->id],
                    ],
                    'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
                ],
            ]);

        $codes = collect($response->json('error.details', []))->pluck('errorCode');
        if ($codes->contains('UNREGISTERED')) {
            DeviceToken::whereKey($device->id)->where('token', $device->token)->delete();

            return;
        }
        if ($response->failed()) {
            Log::warning('FCM delivery failed.', ['lead_id' => $lead->id, 'device_id' => $device->id, 'status' => $response->status()]);
            throw new \RuntimeException('FCM respondió HTTP '.$response->status());
        }
    }
}
