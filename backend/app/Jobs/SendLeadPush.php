<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use App\Models\Lead;
use App\Services\PushNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendLeadPush implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 25;

    public function __construct(public readonly int $leadId, public readonly int $deviceId) {}

    public function backoff(): array
    {
        return [60, 300];
    }

    public function handle(PushNotificationService $push): void
    {
        $device = DeviceToken::eligibleRecipient()->find($this->deviceId);
        $lead = Lead::find($this->leadId);
        if ($device && $lead) {
            $push->sendToDevice($device, $lead);
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Lead push exhausted retries.', ['lead_id' => $this->leadId, 'device_id' => $this->deviceId]);
    }
}
