<?php

namespace Tests\Feature;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Models\ReviewMedia;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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

    public function test_registered_user_can_create_review_with_up_to_three_images(): void
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
            ->assertJsonPath('data.status', ReviewStatus::Pending->value)
            ->assertJsonCount(2, 'data.media');

        $this->assertDatabaseHas('reviews', [
            'user_id' => $user->id,
            'author_email' => $user->email,
            'status' => ReviewStatus::Pending->value,
        ]);

        Storage::disk('public')->assertExists(ReviewMedia::firstOrFail()->path);
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

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/me/reviews/{$review->id}", [
            'rating' => 4,
            'title' => 'Actualizada',
            'body' => 'Actualizo mi resena con mas detalles despues del viaje.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ReviewStatus::Pending->value)
            ->assertJsonPath('data.admin_response', null);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'status' => ReviewStatus::Pending->value,
            'admin_response' => null,
            'approved_at' => null,
        ]);

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
