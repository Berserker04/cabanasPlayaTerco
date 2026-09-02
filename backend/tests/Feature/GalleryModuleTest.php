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

    public function test_public_gallery_defaults_to_standalone_items_and_filters_album_items_by_album(): void
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
            'gallery_album_id' => null,
            'url'              => 'https://example.test/suelta.jpg',
            'thumbnail_url'    => 'https://example.test/suelta-thumb.jpg',
            'caption'          => 'Foto suelta de playa',
            'category'         => GalleryCategory::Beach,
            'type'             => 'image',
            'is_active'        => true,
            'is_featured'      => false,
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
            ->assertJsonPath('data.0.url', 'https://example.test/suelta.jpg')
            ->assertJsonPath('data.0.gallery_album_id', null);

        $this->getJson('/api/v1/gallery?album=playa-viva')
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
        Storage::fake('s3');
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
        Storage::disk('s3')->assertExists($path);

        $itemId = $uploadResponse->json('data.id');

        $this->putJson("/api/v1/admin/gallery-albums/{$albumId}", [
            'cover_gallery_item_id' => $itemId,
        ])
            ->assertOk()
            ->assertJsonPath('data.cover_gallery_item_id', $itemId);
    }

    public function test_admin_can_upload_standalone_media_and_create_album_with_multiple_files(): void
    {
        Storage::fake('s3');
        Sanctum::actingAs($this->createAdmin());

        $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/admin/gallery', [
                'category'    => 'beach',
                'caption'     => 'Foto suelta',
                'file'        => UploadedFile::fake()->create('suelta.jpg', 512, 'image/jpeg'),
                'is_active'   => '1',
                'is_featured' => '0',
            ])
            ->assertCreated()
            ->assertJsonPath('data.gallery_album_id', null)
            ->assertJsonPath('data.type', 'image');

        $albumResponse = $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/admin/gallery-albums', [
                'title'         => 'Album mixto',
                'slug'          => 'album-mixto',
                'description'   => 'Fotos y videos.',
                'category'      => 'beach',
                'is_active'     => '1',
                'is_featured'   => '1',
                'cover_index'   => '1',
                'files'         => [
                    UploadedFile::fake()->create('playa.jpg', 512, 'image/jpeg'),
                    UploadedFile::fake()->create('recorrido.mp4', 2048, 'video/mp4'),
                ],
                'file_captions' => ['Playa', 'Recorrido'],
                'file_alts'     => ['Playa', 'Video de recorrido'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'album-mixto')
            ->assertJsonPath('data.items_count', 2)
            ->assertJsonPath('data.images_count', 1)
            ->assertJsonPath('data.videos_count', 1);

        $album = GalleryAlbum::where('slug', 'album-mixto')->firstOrFail();
        $this->assertNotNull($album->cover_gallery_item_id);
        $this->assertSame('video', $album->coverItem->type);
    }

    public function test_admin_can_upload_gallery_media_for_map_points(): void
    {
        Storage::fake('s3');
        Sanctum::actingAs($this->createAdmin());

        $response = $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/admin/gallery', [
                'map_point'   => 'kiosco',
                'category'    => 'general',
                'caption'     => 'Kiosco',
                'alt'         => 'Kiosco Playa Terco',
                'is_active'   => '1',
                'is_featured' => '0',
                'file'        => UploadedFile::fake()->create('kiosco.jpg', 512, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.map_point', 'kiosco')
            ->assertJsonPath('data.map_point_label', 'Kiosco')
            ->assertJsonPath('data.gallery_album_id', null)
            ->assertJsonPath('data.category', 'general');

        Storage::disk('s3')->assertExists($response->json('data.path'));
    }

    public function test_gallery_map_point_filter_returns_only_active_matching_media(): void
    {
        GalleryItem::create([
            'map_point' => 'kiosco',
            'url'       => 'https://example.test/kiosco.jpg',
            'category'  => 'general',
            'type'      => 'image',
            'is_active' => true,
        ]);

        GalleryItem::create([
            'map_point' => 'cocina_comedor',
            'url'       => 'https://example.test/cocina.jpg',
            'category'  => 'food',
            'type'      => 'image',
            'is_active' => true,
        ]);

        GalleryItem::create([
            'map_point' => 'kiosco',
            'url'       => 'https://example.test/kiosco-oculto.jpg',
            'category'  => 'general',
            'type'      => 'image',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/gallery?map_point=kiosco&type=image')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.url', 'https://example.test/kiosco.jpg')
            ->assertJsonPath('data.0.map_point', 'kiosco')
            ->assertJsonPath('data.0.map_point_label', 'Kiosco');
    }

    public function test_admin_gallery_rejects_invalid_map_point(): void
    {
        Storage::fake('s3');
        Sanctum::actingAs($this->createAdmin());

        $this
            ->withHeader('Accept', 'application/json')
            ->post('/api/v1/admin/gallery', [
                'map_point' => 'muelle',
                'category'  => 'general',
                'file'      => UploadedFile::fake()->create('muelle.jpg', 512, 'image/jpeg'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['map_point']);
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
