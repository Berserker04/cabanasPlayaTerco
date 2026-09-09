<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');
    }

    private function user(bool $admin = false): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => $admin ? 'admin' : 'user'], ['display_name' => 'Test']);
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        return $user;
    }

    private function makePost(User $user, array $data = []): Post
    {
        return Post::create($data + [
            'user_id' => $user->id, 'type' => 'experience', 'title' => 'Una experiencia en el Pacífico',
            'slug' => 'experiencia-'.uniqid(), 'body' => '<p>Una visita inolvidable para compartir con otros viajeros.</p>',
            'status' => 'published', 'published_at' => now()->subDay(),
        ]);
    }

    private function media(User $user, ?Post $post = null, string $type = 'image'): PostMedia
    {
        $path = 'posts/media/'.uniqid().($type === 'image' ? '.jpg' : '.mp4');
        Storage::disk('public')->put($path, 'test');

        return PostMedia::create([
            'user_id' => $user->id, 'post_id' => $post?->id,
            'url' => Storage::disk('public')->url($path), 'path' => $path,
            'type' => $type, 'mime_type' => $type === 'image' ? 'image/jpeg' : 'video/mp4', 'size_bytes' => 4,
        ]);
    }

    public function test_draft_can_be_saved_reopened_cleared_and_published_without_exposing_it_early(): void
    {
        $user = $this->user();
        $draft = $this->postJson('/api/v1/me/posts', ['title' => 'Mi', 'status' => 'draft'])
            ->assertCreated()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.published_at', null)->json('data');
        $id = $draft['id'];
        $this->getJson("/api/v1/me/posts/$id")->assertOk()->assertJsonPath('data.body', '');
        $this->getJson('/api/v1/posts/'.$draft['slug'])->assertNotFound();
        $this->putJson("/api/v1/me/posts/$id", ['body' => '<p>Un comienzo.</p>'])->assertOk()->assertJsonPath('data.status', 'draft');
        $this->putJson("/api/v1/me/posts/$id", ['body' => ''])->assertOk()->assertJsonPath('data.body', '');
        $this->putJson("/api/v1/me/posts/$id", ['status' => 'published'])->assertUnprocessable()->assertJsonValidationErrors(['title', 'body']);
        $result = $this->putJson("/api/v1/me/posts/$id", [
            'title' => 'Mi experiencia terminada', 'body' => '<p>Un viaje maravilloso que disfrutamos con toda la familia.</p>', 'status' => 'published',
            'published_at' => '2030-01-01',
        ])->assertOk()->assertJsonPath('data.status', 'published')->json('data');
        $this->assertNotNull($result['published_at']);
        $this->assertSame($draft['slug'], $result['slug']);
        $this->getJson('/api/v1/posts/'.$draft['slug'])->assertOk();
        $this->assertSame($user->id, Post::find($id)->user_id);
    }

    public function test_publishing_validates_sanitized_text_not_markup_or_entities(): void
    {
        $this->user();
        foreach (['<p>'.str_repeat('&nbsp;', 30).'</p>', '<script>some sufficiently long script only</script>', '<p><strong>x</strong></p>'] as $body) {
            $this->postJson('/api/v1/me/posts', ['title' => 'Valid title', 'body' => $body])
                ->assertUnprocessable()->assertJsonValidationErrors('body');
        }
    }

    public function test_archive_cannot_be_bypassed_and_publication_date_is_preserved(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $published = $post->published_at->toISOString();
        $post->update(['status' => 'archived']);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['title' => 'Editado por el autor'])
            ->assertOk()->assertJsonPath('data.status', 'archived')->assertJsonPath('data.published_at', $published);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['status' => 'published'])->assertUnprocessable();
        $this->putJson("/api/v1/me/posts/{$post->id}", ['status' => 'draft'])->assertUnprocessable();
        $this->getJson("/api/v1/posts/{$post->slug}")->assertNotFound();
        $this->user(true);
        $this->putJson("/api/v1/admin/posts/{$post->id}", ['status' => 'published'])->assertOk()
            ->assertJsonPath('data.published_at', $published);
    }

    public function test_admin_creates_unique_slugs_including_deleted_titles_and_preserves_metadata(): void
    {
        $admin = $this->user(true);
        $post = $this->makePost($admin, ['slug' => 'titulo-repetido']);
        $post->delete();
        $result = $this->postJson('/api/v1/admin/posts', [
            'title' => 'Título repetido', 'status' => 'draft', 'meta_title' => 'Título SEO especial',
            'meta_description' => 'Una descripción manual.',
        ])->assertCreated()->assertJsonPath('data.slug', 'titulo-repetido-2')->json('data');
        $this->putJson('/api/v1/admin/posts/'.$result['id'], ['title' => 'Nuevo título'])
            ->assertOk()->assertJsonPath('data.slug', 'titulo-repetido-2')->assertJsonPath('data.meta_title', 'Título SEO especial');
    }

    public function test_media_ownership_allows_staff_additions_but_rejects_unattached_foreign_files(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $other = User::factory()->create();
        $foreign = $this->media($other);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => [$foreign->id]])->assertUnprocessable();
        $admin = $this->user(true);
        $this->putJson("/api/v1/admin/posts/{$post->id}", ['media_ids' => [$foreign->id]])->assertUnprocessable();
        $staffImage = $this->media($admin);
        $this->putJson("/api/v1/admin/posts/{$post->id}", ['media_ids' => [$staffImage->id], 'cover_media_id' => $staffImage->id])->assertOk();
        Sanctum::actingAs($owner);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => [$staffImage->id], 'media_alt' => [$staffImage->id => 'Una cabaña junto al mar']])
            ->assertOk()->assertJsonPath('data.media.0.alt', 'Una cabaña junto al mar');
        $this->deleteJson("/api/v1/me/posts/media/{$staffImage->id}")->assertForbidden();
    }

    public function test_cover_removal_is_explicit_and_video_cannot_be_cover(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $image = $this->media($owner);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => [$image->id], 'cover_media_id' => $image->id])
            ->assertOk()->assertJsonPath('data.cover_media_id', $image->id);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['cover_media_id' => null])->assertOk()
            ->assertJsonPath('data.featured_image', null)->assertJsonPath('data.cover_image_path', null)->assertJsonPath('data.media_count', 1);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['title' => 'La portada sigue retirada'])->assertOk()
            ->assertJsonPath('data.featured_image', null)->assertJsonPath('data.cover_image_path', null);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['cover_media_id' => $image->id])->assertOk();
        $this->putJson("/api/v1/me/posts/{$post->id}", ['featured_image' => null])->assertOk()
            ->assertJsonPath('data.featured_image', null)->assertJsonPath('data.cover_image_path', null);
        $video = $this->media($owner, type: 'video');
        $this->putJson("/api/v1/me/posts/{$post->id}", ['cover_media_id' => $video->id])->assertUnprocessable()->assertJsonValidationErrors('cover_media_id');
    }

    public function test_image_attributes_round_trip_and_unsafe_html_is_removed(): void
    {
        $this->user();
        $body = '<p>Un contenido bastante largo para poder publicar la experiencia.</p><img src="https://example.com/playa.jpg" data-size="small" data-align="right" alt="Playa" onerror="alert(1)" style="position:fixed"><a href="javascript:alert(1)">Enlace</a>';
        $result = $this->postJson('/api/v1/me/posts', ['title' => 'Imagen con ajustes', 'body' => $body])->assertCreated()->json('data');
        $this->assertStringContainsString('data-size="small"', $result['body']);
        $this->assertStringContainsString('data-align="right"', $result['body']);
        $this->assertStringNotContainsString('onerror', $result['body']);
        $this->assertStringNotContainsString('javascript:', $result['body']);
        $this->assertStringNotContainsString('position:', $result['body']);
        $this->putJson('/api/v1/me/posts/'.$result['id'], ['body' => $result['body']])
            ->assertOk()->assertJsonPath('data.body', $result['body']);
        $invalid = $this->putJson('/api/v1/me/posts/'.$result['id'], ['body' => str_replace('small', 'enormous', $result['body'])])->assertOk()->json('data.body');
        $this->assertStringNotContainsString('enormous', $invalid);
    }

    public function test_removing_media_requires_removing_body_reference_and_preserves_other_files(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $image = $this->media($owner, $post);
        $post->update(['body' => $post->body.'<img src="'.$image->url.'">']);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => [], 'cover_media_id' => null])->assertUnprocessable();
        $this->assertSame($post->id, $image->fresh()->post_id);
        $other = $this->makePost($owner, ['body' => '<p>Esta publicación conserva una referencia a la imagen.</p><img src="'.$image->url.'">']);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['body' => '<p>Ahora el contenido no tiene ninguna imagen asociada.</p>', 'media_ids' => [], 'cover_media_id' => null])
            ->assertOk()->assertJsonPath('data.media_count', 0);
        Storage::disk('public')->assertExists($image->path);
        $this->assertStringContainsString($image->url, $other->fresh()->body);
    }

    public function test_discard_upload_checks_ownership_and_attachment(): void
    {
        $owner = $this->user();
        $free = $this->media($owner);
        $this->deleteJson("/api/v1/me/posts/media/{$free->id}")->assertOk();
        $this->assertDatabaseMissing('post_media', ['id' => $free->id]);
        Storage::disk('public')->assertMissing($free->path);
        $attached = $this->media($owner, $this->makePost($owner));
        $this->deleteJson("/api/v1/me/posts/media/{$attached->id}")->assertStatus(409);
        $foreign = $this->media(User::factory()->create());
        $this->deleteJson("/api/v1/me/posts/media/{$foreign->id}")->assertForbidden();
    }

    public function test_comments_counts_visibility_parent_rules_and_delete_cascade(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $root = $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Un comentario principal'])->assertCreated()->json('data.id');
        $reply = $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Una respuesta visible', 'parent_id' => $root])->assertCreated()->json('data.id');
        $this->getJson("/api/v1/posts/{$post->slug}")->assertOk()->assertJsonPath('data.comments_count', 2);
        $this->getJson('/api/v1/posts')->assertJsonPath('data.0.comments_count', 2);
        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Respuesta anidada', 'parent_id' => $reply])->assertUnprocessable();
        $this->user(true);
        $this->putJson("/api/v1/admin/comments/$root", ['status' => 'rejected'])->assertOk();
        $this->getJson("/api/v1/posts/{$post->slug}")->assertJsonPath('data.comments_count', 0)->assertJsonCount(0, 'data.comments');
        $this->getJson('/api/v1/posts')->assertJsonPath('data.0.comments_count', 0);
        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Respuesta a oculto', 'parent_id' => $root])->assertUnprocessable();
        $this->getJson('/api/v1/admin/comments?post_id='.$post->id)->assertOk()->assertJsonPath('data.0.parent.id', $root)->assertJsonPath('meta.last_page', 1);
        $this->deleteJson("/api/v1/admin/comments/$root")->assertOk();
        $this->assertDatabaseMissing('comments', ['id' => $reply]);
    }

    public function test_post_deletion_cleans_its_comments_but_not_other_publications(): void
    {
        $owner = $this->user();
        $post = $this->makePost($owner);
        $other = $this->makePost($owner);
        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Se elimina con el blog'])->assertCreated();
        $remaining = $this->postJson("/api/v1/posts/{$other->id}/comments", ['body' => 'Este se conserva'])->assertCreated()->json('data.id');
        $this->deleteJson("/api/v1/me/posts/{$post->id}")->assertOk();
        $this->assertSoftDeleted('posts', ['id' => $post->id]);
        $this->assertSame(1, Comment::count());
        $this->assertDatabaseHas('comments', ['id' => $remaining]);
    }

    public function test_private_details_and_paginated_filters_are_authorized_and_complete(): void
    {
        $owner = $this->user();
        for ($i = 0; $i < 15; $i++) {
            $this->makePost($owner, ['title' => "Viaje familiar $i", 'status' => 'draft', 'published_at' => null]);
        }
        $this->makePost($owner, ['title' => 'Otra publicación']);
        $foreign = $this->makePost(User::factory()->create());
        $this->getJson("/api/v1/me/posts/{$foreign->id}")->assertForbidden();
        $this->getJson('/api/v1/me/posts?search=familiar&status=draft&page=2&per_page=12')
            ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('meta.total', 15)->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/v1/admin/posts')->assertForbidden();
        $this->user(true);
        $this->getJson('/api/v1/admin/posts?search=familiar&status=draft&page=2&per_page=12')
            ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('meta.total', 15);
    }

    public function test_encoded_media_urls_cannot_leave_dangling_references_or_delete_shared_files(): void
    {
        $owner = $this->user();
        $image = $this->media($owner);
        $image->update(['url' => 'https://example.com/cabañas/'.basename($image->path)]);
        $post = $this->makePost($owner, ['body' => '<p>Esta publicación usa una imagen con ruta codificada.</p><img src="'.str_replace('ñ', '%C3%B1', $image->url).'">']);
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => [$image->id], 'cover_media_id' => null])->assertOk();
        $this->putJson("/api/v1/me/posts/{$post->id}", ['media_ids' => []])->assertUnprocessable();
        $image->fresh()->update(['post_id' => null]);
        $this->deleteJson("/api/v1/me/posts/media/{$image->id}")->assertOk();
        Storage::disk('public')->assertExists($image->path);
        $this->assertDatabaseHas('post_media', ['id' => $image->id]);
        $post->update(['body' => '<p>Ya no se utiliza la imagen.</p>']);
        $this->deleteJson("/api/v1/me/posts/media/{$image->id}")->assertOk();
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_failed_upload_cleanup_can_be_retried_without_losing_the_record(): void
    {
        $owner = $this->user();
        $image = $this->media($owner);
        $this->mock(\App\Services\FileUploadService::class, function ($mock): void {
            $mock->shouldReceive('delete')->once()->andReturn(false);
        });
        $this->deleteJson("/api/v1/me/posts/media/{$image->id}")->assertStatus(503);
        $this->assertDatabaseHas('post_media', ['id' => $image->id, 'post_id' => null]);
        Storage::disk('public')->assertExists($image->path);
    }
}
