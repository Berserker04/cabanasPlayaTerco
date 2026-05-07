<?php

namespace Tests\Feature;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\Comment;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');
    }

    public function test_registered_user_can_create_published_experience_blog_with_sanitized_body(): void
    {
        $user = $this->createUserWithRole('user');
        Sanctum::actingAs($user);

        $mediaResponse = $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/me/posts/media', [
                'file' => UploadedFile::fake()->create('playa.jpg', 512, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'image');

        $mediaId = $mediaResponse->json('data.id');

        $response = $this->postJson('/api/v1/me/posts', [
            'title' => 'Mi experiencia en Playa Terco',
            'summary' => 'Un viaje para recordar.',
            'body' => '<script>alert("x")</script><h2>La llegada</h2><p>Contenido amplio de una experiencia turistica junto al mar.</p>',
            'cover_media_id' => $mediaId,
            'media_ids' => [$mediaId],
            'visit_date' => now()->toDateString(),
            'travel_style' => 'Familia',
            'tag_names' => ['playa', 'descanso'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.type', PostType::Experience->value)
            ->assertJsonPath('data.status', PostStatus::Published->value)
            ->assertJsonPath('data.media_count', 1);

        $postId = $response->json('data.id');
        $post = Post::findOrFail($postId);

        $this->assertStringNotContainsString('<script', $post->body);
        $this->assertSame($user->id, $post->user_id);
        $this->assertNotNull($post->published_at);
        Storage::disk('public')->assertExists(PostMedia::firstOrFail()->path);

        $this->getJson('/api/v1/posts?type=experience')
            ->assertOk()
            ->assertJsonPath('data.0.id', $postId);

        $this->getJson("/api/v1/posts/{$post->slug}")
            ->assertOk()
            ->assertJsonPath('data.body', $post->body)
            ->assertJsonPath('data.media.0.id', $mediaId);
    }

    public function test_user_can_update_and_delete_only_owned_blog(): void
    {
        $owner = $this->createUserWithRole('user');
        $other = $this->createUserWithRole('user');
        $post = $this->createExperienceFor($owner);
        $otherPost = $this->createExperienceFor($other);

        Sanctum::actingAs($owner);

        $this->putJson("/api/v1/me/posts/{$post->id}", [
            'title' => 'Experiencia actualizada',
            'body' => '<p>Contenido actualizado con suficientes detalles para publicar.</p>',
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Experiencia actualizada')
            ->assertJsonPath('data.status', PostStatus::Published->value);

        $this->putJson("/api/v1/me/posts/{$otherPost->id}", [
            'title' => 'Intento ajeno',
            'body' => '<p>No deberia poder editar este blog ajeno.</p>',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/me/posts/{$post->id}")
            ->assertOk();

        $this->assertSoftDeleted('posts', ['id' => $post->id]);
    }

    public function test_media_upload_limits_images_and_videos(): void
    {
        Sanctum::actingAs($this->createUserWithRole('user'));

        $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/me/posts/media', [
                'file' => UploadedFile::fake()->create('recorrido.mp4', 2048, 'video/mp4'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'video');

        $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/me/posts/media', [
                'file' => UploadedFile::fake()->create('imagen-pesada.jpg', 10241, 'image/jpeg'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_comments_are_published_immediately_and_parent_must_belong_to_same_post(): void
    {
        $user = $this->createUserWithRole('user');
        $post = $this->createExperienceFor($this->createUserWithRole('user'));
        $otherPost = $this->createExperienceFor($this->createUserWithRole('user'));
        $foreignComment = Comment::create([
            'commentable_type' => Post::class,
            'commentable_id' => $otherPost->id,
            'user_id' => $user->id,
            'author_name' => $user->name,
            'body' => 'Comentario en otro blog.',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($user);

        $commentResponse = $this->postJson("/api/v1/posts/{$post->id}/comments", [
            'body' => 'Gracias por compartir esta experiencia.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('comments', [
            'id' => $commentResponse->json('data.id'),
            'status' => 'approved',
        ]);

        $this->postJson("/api/v1/posts/{$post->id}/comments", [
            'body' => 'Respuesta con padre ajeno.',
            'parent_id' => $foreignComment->id,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_admin_can_intervene_blogs_and_comments(): void
    {
        $admin = $this->createUserWithRole('admin');
        $post = $this->createExperienceFor($this->createUserWithRole('user'));
        $comment = Comment::create([
            'commentable_type' => Post::class,
            'commentable_id' => $post->id,
            'user_id' => $post->user_id,
            'author_name' => $post->author->name,
            'body' => 'Comentario visible.',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($admin);

        $this->putJson("/api/v1/admin/posts/{$post->id}", [
            'status' => PostStatus::Archived->value,
            'summary' => 'Intervenido por administracion.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', PostStatus::Archived->value)
            ->assertJsonPath('data.summary', 'Intervenido por administracion.');

        $this->getJson('/api/v1/posts')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->putJson("/api/v1/admin/comments/{$comment->id}", [
            'status' => 'rejected',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->deleteJson("/api/v1/admin/posts/{$post->id}")
            ->assertOk();

        $this->assertSoftDeleted('posts', ['id' => $post->id]);
    }

    private function createExperienceFor(User $user, array $overrides = []): Post
    {
        return Post::create(array_merge([
            'user_id' => $user->id,
            'type' => PostType::Experience,
            'title' => 'Experiencia de prueba',
            'slug' => 'experiencia-de-prueba-'.uniqid(),
            'excerpt' => 'Una experiencia breve.',
            'summary' => 'Una experiencia breve junto al mar.',
            'body' => '<p>Una experiencia con suficiente detalle para validar el modulo.</p>',
            'status' => PostStatus::Published,
            'published_at' => now(),
        ], $overrides));
    }

    private function createUserWithRole(string $roleName): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => ucfirst($roleName)],
        );

        $user->roles()->attach($role);

        return $user;
    }
}
