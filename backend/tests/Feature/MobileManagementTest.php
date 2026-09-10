<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Jobs\SendLeadPush;
use App\Models\DeviceToken;
use App\Models\Lead;
use App\Models\Role;
use App\Models\User;
use App\Services\FirebaseAccessTokenProvider;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MobileManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Http::preventStrayRequests();
    }

    private function user(string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => $role]));

        return $user;
    }

    private function lead(array $attributes = []): Lead
    {
        return Lead::create(array_merge([
            'name' => 'Turista de prueba', 'email' => 'turista@example.test',
            'phone' => '+573001234567', 'message' => 'Solicito una cotización para una estadía.',
            'source' => 'website', 'status' => 'new',
        ], $attributes));
    }

    private function device(User $user, string $name = 'mobile'): DeviceToken
    {
        return DeviceToken::create([
            'user_id' => $user->id, 'token' => 'fcm-'.$user->id.'-'.$name, 'platform' => 'android',
            'personal_access_token_id' => $user->createToken($name, ['mobile'])->accessToken->id,
        ]);
    }

    private function bearer(string $token): static
    {
        Auth::forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    public function test_viewer_mobile_login_can_read_operations_but_cannot_mutate_or_register_push(): void
    {
        $user = $this->user('viewer');
        $token = $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $user->email, 'password' => 'password',
        ])->assertOk()->json('data.token');
        $lead = $this->lead();
        $this->bearer($token)->getJson('/api/v1/admin/leads/'.$lead->id)->assertOk();
        $this->bearer($token)->getJson('/api/v1/admin/availability/calendar?month=2030-12')->assertOk();
        $this->bearer($token)->putJson('/api/v1/admin/leads/'.$lead->id, ['status' => 'lost'])->assertForbidden();
        $this->bearer($token)->postJson('/api/v1/admin/reservations', [])->assertForbidden();
        $this->bearer($token)->getJson('/api/v1/admin/users')->assertForbidden();
        $this->bearer($token)->postJson('/api/v1/auth/mobile/device-token', ['token' => 'viewer', 'platform' => 'android'])->assertForbidden();
        $this->assertDatabaseCount('device_tokens', 0);
    }

    public function test_device_refresh_and_logout_are_scoped_to_current_session(): void
    {
        $user = $this->user();
        $first = $user->createToken('first', ['mobile']);
        $second = $user->createToken('second', ['mobile']);
        $this->bearer($first->plainTextToken)->postJson('/api/v1/auth/mobile/device-token', ['token' => 'first', 'platform' => 'android'])->assertOk();
        $this->bearer($second->plainTextToken)->postJson('/api/v1/auth/mobile/device-token', ['token' => 'second', 'platform' => 'android'])->assertOk();
        $this->bearer($first->plainTextToken)->postJson('/api/v1/auth/mobile/device-token', ['token' => 'refreshed', 'platform' => 'android'])->assertOk();
        $this->assertDatabaseMissing('device_tokens', ['token' => 'first']);
        $this->assertDatabaseCount('device_tokens', 2);
        $this->bearer($first->plainTextToken)->postJson('/api/v1/auth/mobile/logout', ['push_token' => 'second'])->assertOk();
        $this->assertDatabaseHas('device_tokens', ['token' => 'second', 'personal_access_token_id' => $second->accessToken->id]);
        $this->assertDatabaseMissing('device_tokens', ['token' => 'refreshed']);
        $this->bearer($second->plainTextToken)->deleteJson('/api/v1/auth/mobile/device-token')->assertOk();
        $this->assertDatabaseCount('device_tokens', 0);
        $this->assertNotNull($second->accessToken->fresh());
    }

    public function test_lead_pagination_has_shared_new_count_and_detail_does_not_mark_read(): void
    {
        $token = $this->user()->createToken('mobile')->plainTextToken;
        $lead = $this->lead(['name' => 'Ana', 'notes' => 'Llamar por la tarde']);
        $this->lead(['name' => 'Luis']);
        $closed = $this->lead(['name' => 'Ana cerrada', 'status' => 'lost']);
        $this->bearer($token)->getJson('/api/v1/admin/leads?search=Ana&per_page=1')
            ->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.new_count', 2)->assertJsonPath('data.0.id', $closed->id);
        $this->bearer($token)->getJson('/api/v1/admin/leads/'.$lead->id)
            ->assertOk()->assertJsonPath('data.notes', 'Llamar por la tarde')->assertJsonPath('data.status', 'new');
        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'new']);
        $this->bearer($token)->putJson('/api/v1/admin/leads/'.$lead->id, ['status' => 'contacted'])->assertOk();
        $this->bearer($token)->getJson('/api/v1/admin/leads?status=lost')->assertJsonPath('meta.new_count', 1);
    }

    public function test_role_changes_revoke_push_and_then_operational_sessions(): void
    {
        $actor = $this->user();
        $target = $this->user('staff');
        $device = $this->device($target);
        $sessionId = $device->personal_access_token_id;
        $viewer = Role::firstOrCreate(['name' => 'viewer'], ['display_name' => 'Visualizador']);
        $userRole = Role::firstOrCreate(['name' => 'user'], ['display_name' => 'Usuario']);
        $token = $actor->createToken('admin')->plainTextToken;

        $this->bearer($token)->putJson('/api/v1/admin/users/'.$target->id, ['role_ids' => [$viewer->id]])->assertOk();
        $this->assertDatabaseMissing('device_tokens', ['id' => $device->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $sessionId]);
        $this->bearer($token)->putJson('/api/v1/admin/users/'.$target->id, ['role_ids' => [$userRole->id]])->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $sessionId]);
    }

    public function test_only_active_staff_with_valid_sessions_are_queued_and_rechecked(): void
    {
        Queue::fake();
        $admin = $this->device($this->user());
        $staff = $this->device($this->user('staff'));
        $this->device($this->user('viewer'));
        $suspended = $this->user();
        $suspended->update(['status' => UserStatus::Suspended]);
        $this->device($suspended);
        $expired = $this->device($this->user());
        $expired->session->update(['expires_at' => now()->subMinute()]);
        $orphan = $this->device($this->user());
        $orphan->session->delete();
        $legacy = $this->device($this->user());
        $legacy->update(['personal_access_token_id' => null]);
        app(PushNotificationService::class)->notifyStaffOfNewLead($this->lead());
        Queue::assertPushed(SendLeadPush::class, 2);
        Queue::assertPushed(SendLeadPush::class, fn ($job) => $job->deviceId === $admin->id);
        Queue::assertPushed(SendLeadPush::class, fn ($job) => $job->deviceId === $staff->id);
        $staff->user->roles()->sync([Role::where('name', 'viewer')->firstOrFail()->id]);
        (new SendLeadPush(Lead::first()->id, $staff->id))->handle(app(PushNotificationService::class));
        Http::assertNothingSent();
    }

    public function test_fcm_uses_v1_oauth_and_removes_unregistered_tokens(): void
    {
        config(['services.firebase.project_id' => 'project-test']);
        $this->mock(FirebaseAccessTokenProvider::class)->shouldReceive('token')->twice()->andReturn('oauth-test');
        $device = $this->device($this->user());
        $lead = $this->lead();
        Http::fakeSequence()->push(['name' => 'projects/project-test/messages/1'])
            ->push(['error' => ['details' => [['errorCode' => 'UNREGISTERED']]]], 404);
        $service = app(PushNotificationService::class);
        $service->sendToDevice($device, $lead);
        Http::assertSent(fn ($request) => $request->url() === 'https://fcm.googleapis.com/v1/projects/project-test/messages:send'
            && $request->hasHeader('Authorization', 'Bearer oauth-test')
            && $request['message']['data']['lead_id'] === (string) $lead->id
            && $request['message']['android']['notification']['channel_id'] === 'quotations');
        $service->sendToDevice($device, $lead);
        $this->assertDatabaseMissing('device_tokens', ['id' => $device->id]);
    }

    public function test_transient_push_failure_keeps_lead_and_device_for_limited_retry(): void
    {
        config(['services.firebase.project_id' => 'project-test']);
        $this->mock(FirebaseAccessTokenProvider::class)->shouldReceive('token')->once()->andReturn('oauth-test');
        $device = $this->device($this->user());
        $lead = $this->lead();
        Http::fakeSequence()->push([], 503);
        $job = new SendLeadPush($lead->id, $device->id);
        $this->assertSame(3, $job->tries);
        try {
            $job->handle(app(PushNotificationService::class));
            $this->fail('Transient errors must be retried by the queue.');
        } catch (\RuntimeException $error) {
            $this->assertStringContainsString('503', $error->getMessage());
        }
        $this->assertDatabaseHas('leads', ['id' => $lead->id]);
        $this->assertDatabaseHas('device_tokens', ['id' => $device->id]);
    }

    public function test_contact_remains_saved_when_queue_dispatch_fails(): void
    {
        $this->mock(PushNotificationService::class)->shouldReceive('notifyStaffOfNewLead')->once()->andThrow(new \RuntimeException('Queue unavailable'));
        $this->postJson('/api/v1/contact', [
            'name' => 'Prueba cola', 'email' => 'qa@example.com', 'phone' => '+573001234567',
            'message' => 'Deseo una cotización para mi familia.',
            'check_in' => now()->addDays(5)->toDateString(),
            'check_out' => now()->addDays(7)->toDateString(),
        ])->assertCreated();
        $this->assertDatabaseHas('leads', ['email' => 'qa@example.com', 'status' => 'new']);
    }
}
