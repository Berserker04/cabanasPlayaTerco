<?php

namespace Tests\Feature;

use App\Enums\GalleryCategory;
use App\Models\GalleryAlbum;
use App\Models\GalleryItem;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GalleryModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_gallery_only_returns_active_items_from_active_albums(): void
    {
        $activeAlbum = GalleryAlbum::create([
            'title'       => 'Playa viva',
            'slug'        => 'playa-viva',
            'category'    => GalleryCategory::Beach,
            'is_active'   => true,
            'is_featured' => true,
        ]);

        $inactiveAlbum = GalleryAlbum::create([
            'title'     => 'Album oculto',
            'slug'      => 'album-oculto',
            'category'  => GalleryCategory::Beach,
            'is_active' => false,
        ]);

        GalleryItem::create([
            'gallery_album_id' => $activeAlbum->id,
            'url'              => 'https://example.test/playa.jpg',
            'thumbnail_url'    => 'https://example.test/playa-thumb.jpg',
            'caption'          => 'Playa frente al Pacifico',
            'category'         => GalleryCategory::Beach,
            'type'             => 'image',
            'is_active'        => true,
            'is_featured'      => true,
        ]);

        GalleryItem::create([
            'gallery_album_id' => $activeAlbum->id,
            'url'              => 'https://example.test/oculta.jpg',
            'category'         => GalleryCategory::Beach,
            'type'             => 'image',
            'is_active'        => false,
        ]);

        GalleryItem::create([
            'gallery_album_id' => $inactiveAlbum->id,
            'url'              => 'https://example.test/album-oculto.jpg',
            'category'         => GalleryCategory::Beach,
            'type'             => 'image',
            'is_active'        => true,
        ]);

        $this->getJson('/api/v1/gallery?category=beach')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.url', 'https://example.test/playa.jpg')
            ->assertJsonPath('data.0.album.slug', 'playa-viva');
    }

    public function test_public_album_index_returns_active_albums_with_counts(): void
    {
        $album = GalleryAlbum::create([
            'title'       => 'Cabanas',
            'slug'        => 'cabanas',
            'category'    => GalleryCategory::Cabins,
            'is_active'   => true,
            'is_featured' => true,
        ]);

        $image = GalleryItem::create([
            'gallery_album_id' => $album->id,
            'url'              => 'https://example.test/cabana.jpg',
            'thumbnail_url'    => 'https://example.test/cabana.jpg',
            'category'         => GalleryCategory::Cabins,
            'type'             => 'image',
            'is_active'        => true,
        ]);

        GalleryItem::create([
            'gallery_album_id' => $album->id,
            'url'              => 'https://example.test/video.mp4',
            'category'         => GalleryCategory::Cabins,
            'type'             => 'video',
            'is_active'        => true,
        ]);

        $album->update(['cover_gallery_item_id' => $image->id]);

        GalleryAlbum::create([
            'title'     => 'Oculto',
            'slug'      => 'oculto',
            'category'  => GalleryCategory::General,
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/gallery/albums')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'cabanas')
            ->assertJsonPath('data.0.items_count', 2)
            ->assertJsonPath('data.0.images_count', 1)
            ->assertJsonPath('data.0.videos_count', 1)
            ->assertJsonPath('data.0.cover_url', 'https://example.test/cabana.jpg');
    }

    public function test_admin_can_create_album_upload_media_and_set_cover(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdmin());

        $albumResponse = $this->postJson('/api/v1/admin/gallery-albums', [
            'title'       => 'Naturaleza',
            'slug'        => 'naturaleza',
            'description' => 'Selva y mar.',
            'category'    => 'nature',
            'is_active'   => true,
            'is_featured' => true,
            'sort_order'  => 1,
        ])->assertCreated();

        $albumId = $albumResponse->json('data.id');

        $uploadResponse = $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/admin/gallery', [
                'gallery_album_id' => $albumId,
                'category'         => 'nature',
                'caption'          => 'Sendero verde',
                'alt'              => 'Sendero entre vegetacion',
                'sort_order'       => 2,
                'is_active'        => '1',
                'is_featured'      => '1',
                'file'             => UploadedFile::fake()->create('sendero.jpg', 512, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.caption', 'Sendero verde')
            ->assertJsonPath('data.type', 'image')
            ->assertJsonPath('data.album.slug', 'naturaleza');

        $path = $uploadResponse->json('data.path');
        Storage::disk('public')->assertExists($path);

        $itemId = $uploadResponse->json('data.id');

        $this->putJson("/api/v1/admin/gallery-albums/{$albumId}", [
            'cover_gallery_item_id' => $itemId,
        ])
            ->assertOk()
            ->assertJsonPath('data.cover_gallery_item_id', $itemId);
    }

    public function test_gallery_admin_endpoints_require_admin_role(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/gallery-albums')->assertForbidden();
        $this->getJson('/api/v1/admin/gallery')->assertForbidden();
    }

    private function createAdmin(): User
    {
        $user = User::factory()->create();
        $role = Role::create([
            'name'         => 'admin',
            'display_name' => 'Administrador',
        ]);

        $user->roles()->attach($role);

        return $user;
    }
}
