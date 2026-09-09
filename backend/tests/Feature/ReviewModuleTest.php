<?php

namespace Tests\Feature;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Models\ReviewMedia;
use App\Models\Role;
use App\Models\User;
use App\Services\FileUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');
    }

    public function test_public_reviews_only_return_approved_records_with_stats(): void
    {
        $approved = Review::create([
            'user_id' => User::factory()->create()->id,
            'author_name' => 'Aprobado',
            'author_email' => 'approved@example.com',
            'rating' => 5,
            'title' => 'Gran experiencia',
            'body' => 'Una experiencia muy tranquila frente al mar.',
            'status' => ReviewStatus::Approved,
            'approved_at' => now(),
            'admin_response' => 'Gracias por visitarnos.',
            'responded_at' => now(),
        ]);

        ReviewMedia::create([
            'review_id' => $approved->id,
            'url' => 'https://example.test/review.jpg',
            'sort_order' => 0,
        ]);

        Review::create([
            'user_id' => User::factory()->create()->id,
            'author_name' => 'Pendiente',
            'author_email' => 'pending@example.com',
            'rating' => 1,
            'title' => 'Oculta',
            'body' => 'Esta resena no debe mostrarse publicamente.',
            'status' => ReviewStatus::Pending,
        ]);

        $this->getJson('/api/v1/reviews')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $approved->id)
            ->assertJsonMissingPath('data.0.author_email')
            ->assertJsonPath('data.0.admin_response', 'Gracias por visitarnos.')
            ->assertJsonPath('data.0.media.0.url', 'https://example.test/review.jpg')
            ->assertJsonPath('meta.average_rating', 5)
            ->assertJsonPath('meta.rating_counts.5', 1);
    }

    public function test_registered_user_publishes_review_and_photos_immediately(): void
    {
        $user = $this->createUserWithRole('user');
        Sanctum::actingAs($user);

        $this->post('/api/v1/reviews', [
            'rating' => 5,
            'title' => 'Volveria',
            'body' => 'La atencion fue muy buena y el lugar es precioso.',
            'images' => [
                UploadedFile::fake()->create('playa-1.jpg', 120, 'image/jpeg'),
                UploadedFile::fake()->create('playa-2.webp', 120, 'image/webp'),
            ],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.author_name', $user->name)
            ->assertJsonPath('data.status', ReviewStatus::Approved->value)
            ->assertJsonCount(2, 'data.media');

        $this->assertDatabaseHas('reviews', [
            'user_id' => $user->id,
            'author_email' => $user->email,
            'status' => ReviewStatus::Approved->value,
        ]);

        $review = Review::firstOrFail();
        $this->assertNotNull($review->approved_at);
        $this->assertNull($review->approved_by);
        foreach (['/api/v1/reviews', '/api/v1/reviews/latest'] as $endpoint) {
            $this->getJson($endpoint)->assertOk()
                ->assertJsonPath('data.0.id', $review->id)
                ->assertJsonCount(2, 'data.0.media');
        }
        Storage::disk('public')->assertExists(ReviewMedia::firstOrFail()->path);
    }

    public function test_review_defaults_to_published_in_model_and_database(): void
    {
        $attributes = [
            'author_name' => 'Viajero',
            'rating' => 5,
            'body' => 'Una estancia agradable frente al mar.',
        ];
        $this->assertSame(ReviewStatus::Approved, Review::create($attributes)->fresh()->status);
        $id = DB::table('reviews')->insertGetId($attributes);
        $this->assertSame(ReviewStatus::Approved, Review::findOrFail($id)->status);
    }

    public function test_anonymous_user_cannot_create_review(): void
    {
        $this->postJson('/api/v1/reviews', [
            'rating' => 5,
            'title' => 'Sin sesion',
            'body' => 'Intento de resena sin usuario registrado.',
        ])->assertUnauthorized();
    }

    public function test_user_can_edit_and_delete_only_owned_reviews(): void
    {
        $owner = $this->createUserWithRole('user');
        $other = $this->createUserWithRole('user');
        $review = $this->createReviewFor($owner, [
            'status' => ReviewStatus::Approved,
            'approved_at' => now(),
            'admin_response' => 'Respuesta previa',
            'responded_at' => now(),
        ]);
        $otherReview = $this->createReviewFor($other);
        $approvedAt = $review->approved_at->toISOString();
        $respondedAt = $review->responded_at->toISOString();

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/me/reviews/{$review->id}", [
            'rating' => 4,
            'title' => 'Actualizada',
            'body' => 'Actualizo mi resena con mas detalles despues del viaje.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ReviewStatus::Approved->value)
            ->assertJsonPath('data.admin_response', 'Respuesta previa');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => ReviewStatus::Approved->value,
            'admin_response' => 'Respuesta previa',
        ]);
        $this->assertSame($approvedAt, $review->fresh()->approved_at->toISOString());
        $this->assertSame($respondedAt, $review->fresh()->responded_at->toISOString());
        $this->getJson('/api/v1/reviews')->assertOk()->assertJsonPath('data.0.title', 'Actualizada');

        $this->putJson("/api/v1/me/reviews/{$otherReview->id}", [
            'rating' => 5,
            'title' => 'Ajena',
            'body' => 'No deberia poder editar una resena ajena.',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/me/reviews/{$review->id}")
            ->assertOk();

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function test_user_cannot_exceed_three_review_images(): void
    {
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user);

        ReviewMedia::create([
            'review_id' => $review->id,
            'url' => 'https://example.test/one.jpg',
            'sort_order' => 0,
        ]);
        ReviewMedia::create([
            'review_id' => $review->id,
            'url' => 'https://example.test/two.jpg',
            'sort_order' => 1,
        ]);

        Sanctum::actingAs($user);

        $this->post('/api/v1/me/reviews/'.$review->id.'/media', [
            'images' => [
                UploadedFile::fake()->create('three.jpg', 120, 'image/jpeg'),
                UploadedFile::fake()->create('four.jpg', 120, 'image/jpeg'),
            ],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['images']);
    }

    public function test_admin_can_moderate_respond_and_delete_reviews(): void
    {
        $admin = $this->createUserWithRole('admin');
        $review = $this->createReviewFor($this->createUserWithRole('user'));

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/reviews/{$review->id}", [
            'status' => ReviewStatus::Approved->value,
            'admin_response' => 'Gracias por compartir tu visita.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ReviewStatus::Approved->value)
            ->assertJsonPath('data.admin_response', 'Gracias por compartir tu visita.');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'approved_by' => $admin->id,
            'responded_by' => $admin->id,
        ]);

        $this->getJson('/api/v1/reviews')
            ->assertOk()
            ->assertJsonPath('data.0.admin_response', 'Gracias por compartir tu visita.');

        $this->putJson("/api/v1/admin/reviews/{$review->id}", [
            'status' => ReviewStatus::Rejected->value,
            'admin_response' => '',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ReviewStatus::Rejected->value);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'approved_at' => null,
            'admin_response' => null,
        ]);
        foreach (['/api/v1/reviews', '/api/v1/reviews/latest'] as $endpoint) {
            $this->getJson($endpoint)->assertOk()->assertJsonCount(0, 'data');
        }

        $this->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertOk();

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function test_admin_review_endpoints_require_admin_role(): void
    {
        Sanctum::actingAs($this->createUserWithRole('user'));

        $this->getJson('/api/v1/admin/reviews')->assertForbidden();
    }

    public function test_user_can_update_profile_and_password(): void
    {
        $user = $this->createUserWithRole('user', [
            'password' => Hash::make('old-password'),
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/v1/auth/profile', [
            'name' => 'Nuevo Nombre',
            'email' => 'nuevo@example.com',
            'phone' => '3147427806',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nuevo Nombre')
            ->assertJsonPath('data.phone', '3147427806');

        $this->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);

        $this->putJson('/api/v1/auth/password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Contrasena actualizada exitosamente.');

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_creation_accepts_zero_one_and_three_photos_but_rejects_four(): void
    {
        Sanctum::actingAs($this->createUserWithRole('user'));
        foreach ([0, 1, 3] as $count) {
            $this->post('/api/v1/reviews', [
                'rating' => 4,
                'body' => 'Una estancia tranquila y agradable frente al mar.',
                'images' => array_map(fn ($i) => UploadedFile::fake()->create("foto-{$i}.jpg", 50, 'image/jpeg'), $count ? range(1, $count) : []),
            ], ['Accept' => 'application/json'])->assertCreated()->assertJsonCount($count, 'data.media');
        }

        $this->post('/api/v1/reviews', [
            'rating' => 4,
            'body' => 'Una estancia tranquila y agradable frente al mar.',
            'images' => array_map(fn ($i) => UploadedFile::fake()->create("foto-{$i}.jpg", 50, 'image/jpeg'), range(1, 4)),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('images');

        $this->assertDatabaseCount('reviews', 3);
        $this->assertDatabaseCount('review_media', 4);
    }

    public function test_image_validation_rejects_wrong_formats_and_oversized_files_on_both_endpoints(): void
    {
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user);
        Sanctum::actingAs($user);

        foreach (['/api/v1/reviews', "/api/v1/me/reviews/{$review->id}/media"] as $endpoint) {
            foreach ([['video.mp4', 100, 'video/mp4'], ['grande.jpg', 10241, 'image/jpeg']] as [$name, $size, $mime]) {
                $this->post($endpoint, [
                    'rating' => 5,
                    'body' => 'Una reseña con suficiente detalle para enviar.',
                    'images' => [UploadedFile::fake()->create($name, $size, $mime)],
                ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('images.0');
            }
        }
        $this->assertDatabaseCount('reviews', 1);
        $this->assertDatabaseCount('review_media', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_saved_photo_count_is_enforced_and_removing_a_photo_releases_a_slot(): void
    {
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user);
        Sanctum::actingAs($user);
        for ($i = 0; $i < 3; $i++) {
            $this->post("/api/v1/me/reviews/{$review->id}/media", ['images' => [UploadedFile::fake()->create("foto-{$i}.png", 50, 'image/png')]], ['Accept' => 'application/json'])->assertCreated();
        }
        $this->post("/api/v1/me/reviews/{$review->id}/media", ['images' => [UploadedFile::fake()->create('cuarta.jpg', 50, 'image/jpeg')]], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('images');
        $photo = $review->media()->firstOrFail();
        $this->deleteJson("/api/v1/me/reviews/{$review->id}/media/{$photo->id}")->assertOk();
        Storage::disk('public')->assertMissing($photo->path);
        $this->post("/api/v1/me/reviews/{$review->id}/media", ['images' => [UploadedFile::fake()->create('nueva.webp', 50, 'image/webp')]], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.0.sort_order', 3);
        $this->assertSame(3, $review->media()->count());
        $this->assertCount(3, Storage::disk('public')->allFiles());
    }

    public function test_adding_and_removing_photos_keeps_review_public_and_preserves_response(): void
    {
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user, ['status' => ReviewStatus::Approved, 'approved_at' => now(), 'admin_response' => 'Gracias', 'responded_at' => now()]);
        Sanctum::actingAs($user);
        $this->post("/api/v1/me/reviews/{$review->id}/media", ['images' => [UploadedFile::fake()->create('playa.jpg', 50, 'image/jpeg')]], ['Accept' => 'application/json'])->assertCreated();
        $this->assertSame(ReviewStatus::Approved, $review->fresh()->status);
        $this->assertSame('Gracias', $review->fresh()->admin_response);
        $this->getJson('/api/v1/reviews')->assertJsonCount(1, 'data')->assertJsonCount(1, 'data.0.media');
        $this->getJson('/api/v1/me/reviews')->assertJsonCount(1, 'data.0.media');

        $photo = $review->media()->firstOrFail();
        $this->deleteJson("/api/v1/me/reviews/{$review->id}/media/{$photo->id}")->assertOk();
        $this->assertSame(ReviewStatus::Approved, $review->fresh()->status);
        $this->assertNotNull($review->fresh()->approved_at);
        $this->assertNotNull($review->fresh()->responded_at);
        $this->assertSame('Gracias', $review->fresh()->admin_response);
        $this->getJson('/api/v1/reviews')->assertJsonCount(1, 'data')->assertJsonCount(0, 'data.0.media');
    }

    public function test_tourist_edits_and_photo_changes_do_not_undo_admin_rejection(): void
    {
        $owner = $this->createUserWithRole('user');
        $admin = $this->createUserWithRole('admin');
        $review = $this->createReviewFor($owner, ['status' => ReviewStatus::Approved, 'approved_at' => now()]);
        Sanctum::actingAs($admin);
        $this->putJson("/api/v1/admin/reviews/{$review->id}", [
            'status' => 'rejected',
            'admin_response' => 'El contenido fue retirado.',
        ])->assertOk();

        Sanctum::actingAs($owner);
        $this->putJson("/api/v1/me/reviews/{$review->id}", [
            'rating' => 4,
            'body' => 'Actualizo mi experiencia con otros detalles de la visita.',
            'status' => 'approved',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->post("/api/v1/me/reviews/{$review->id}/media", [
            'images' => [UploadedFile::fake()->create('playa.jpg', 50, 'image/jpeg')],
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertSame(ReviewStatus::Rejected, $review->fresh()->status);
        $this->getJson('/api/v1/reviews')->assertOk()->assertJsonCount(0, 'data');
        $photo = $review->media()->firstOrFail();
        $this->deleteJson("/api/v1/me/reviews/{$review->id}/media/{$photo->id}")->assertOk();
        $this->assertSame(ReviewStatus::Rejected, $review->fresh()->status);
        $this->assertSame('El contenido fue retirado.', $review->fresh()->admin_response);
        $this->getJson('/api/v1/reviews/latest')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($admin);
        $this->putJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();
        $this->getJson('/api/v1/reviews')->assertOk()->assertJsonPath('data.0.id', $review->id);
    }

    public function test_photo_permissions_require_ownership_and_matching_review(): void
    {
        $owner = $this->createUserWithRole('user');
        $other = $this->createUserWithRole('user');
        $review = $this->createReviewFor($owner);
        $otherReview = $this->createReviewFor($other);
        $otherPhoto = $otherReview->media()->create(['url' => 'https://example.test/photo.jpg', 'sort_order' => 0]);
        Sanctum::actingAs($owner);
        $this->post("/api/v1/me/reviews/{$otherReview->id}/media", ['images' => [UploadedFile::fake()->create('foto.jpg', 50, 'image/jpeg')]], ['Accept' => 'application/json'])->assertForbidden();
        $this->deleteJson("/api/v1/me/reviews/{$review->id}/media/{$otherPhoto->id}")->assertNotFound();
        $this->deleteJson("/api/v1/me/reviews/{$otherReview->id}/media/{$otherPhoto->id}")->assertForbidden();
        $this->deleteJson("/api/v1/me/reviews/{$otherReview->id}")->assertForbidden();
        $this->assertDatabaseHas('review_media', ['id' => $otherPhoto->id]);
    }

    public function test_failed_initial_upload_rolls_back_review_and_new_files(): void
    {
        Sanctum::actingAs($this->createUserWithRole('user'));
        $this->failSecondUpload();
        $this->post('/api/v1/reviews', [
            'rating' => 5, 'body' => 'Una estancia agradable cerca del mar y la naturaleza.',
            'images' => [UploadedFile::fake()->create('uno.jpg', 50, 'image/jpeg'), UploadedFile::fake()->create('dos.jpg', 50, 'image/jpeg')],
        ], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('reviews', 0);
        $this->assertDatabaseCount('review_media', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_failed_addition_preserves_existing_photo_and_moderation(): void
    {
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user, ['status' => ReviewStatus::Approved, 'admin_response' => 'Respuesta existente']);
        Storage::disk('public')->put('reviews/media/existing.jpg', 'existing');
        $review->media()->create(['url' => '/storage/reviews/media/existing.jpg', 'path' => 'reviews/media/existing.jpg', 'sort_order' => 0]);
        Sanctum::actingAs($user);
        $this->failSecondUpload();
        $this->post("/api/v1/me/reviews/{$review->id}/media", ['images' => [UploadedFile::fake()->create('uno.jpg', 50, 'image/jpeg'), UploadedFile::fake()->create('dos.jpg', 50, 'image/jpeg')]], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('review_media', 1);
        $this->assertSame(['reviews/media/existing.jpg'], Storage::disk('public')->allFiles());
        $this->assertSame(ReviewStatus::Approved, $review->fresh()->status);
        $this->assertSame('Respuesta existente', $review->fresh()->admin_response);
    }

    public function test_admin_can_respond_while_pending_and_status_only_changes_preserve_reply_date(): void
    {
        $admin = $this->createUserWithRole('admin');
        $review = $this->createReviewFor($this->createUserWithRole('user'));
        Sanctum::actingAs($admin);
        $this->putJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'pending', 'admin_response' => 'Gracias por escribirnos.'])->assertOk()->assertJsonPath('data.status', 'pending');
        $replyDate = $review->fresh()->responded_at->toISOString();
        $this->travel(2)->days();
        $this->putJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();
        $this->assertSame($replyDate, $review->fresh()->responded_at->toISOString());
        $this->putJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved', 'admin_response' => null])->assertOk()->assertJsonPath('data.responded_at', null);
    }

    public function test_admin_can_filter_and_paginate_and_receives_photos(): void
    {
        $admin = $this->createUserWithRole('admin');
        $user = $this->createUserWithRole('user');
        $review = $this->createReviewFor($user, ['title' => 'Playa especial']);
        $review->media()->create(['url' => 'https://example.test/photo.jpg', 'sort_order' => 0]);
        $this->createReviewFor($user, ['status' => ReviewStatus::Approved]);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/reviews?status=pending&search=especial')->assertOk()->assertJsonCount(1, 'data')->assertJsonCount(1, 'data.0.media')->assertJsonPath('meta.status_counts.approved', 1);
        $this->getJson('/api/v1/admin/reviews?per_page=1&page=2')->assertOk()->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.last_page', 2);
    }

    private function failSecondUpload(): void
    {
        $real = new FileUploadService;
        $calls = 0;
        $this->mock(FileUploadService::class, function ($mock) use ($real, &$calls): void {
            $mock->shouldReceive('upload')->twice()->andReturnUsing(function ($file, $directory) use ($real, &$calls) {
                if (++$calls === 2) {
                    throw ValidationException::withMessages(['file' => 'Carga interrumpida.']);
                }

                return $real->upload($file, $directory);
            });
            $mock->shouldReceive('delete')->once()->andReturnUsing(fn ($path) => $real->delete($path));
        });
    }

    private function createReviewFor(User $user, array $overrides = []): Review
    {
        return Review::create(array_merge([
            'user_id' => $user->id,
            'author_name' => $user->name,
            'author_email' => $user->email,
            'rating' => 5,
            'title' => 'Resena de prueba',
            'body' => 'Una resena con suficiente detalle para validar el modulo.',
            'status' => ReviewStatus::Pending,
        ], $overrides));
    }

    private function createUserWithRole(string $roleName, array $overrides = []): User
    {
        $user = User::factory()->create($overrides);
        $role = Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => ucfirst($roleName)],
        );

        $user->roles()->attach($role);

        return $user;
    }
}
