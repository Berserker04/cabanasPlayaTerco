<?php

namespace Database\Seeders;

use App\Enums\GalleryCategory;
use App\Models\GalleryAlbum;
use App\Models\GalleryItem;
use Illuminate\Database\Seeder;

class GallerySeeder extends Seeder
{
    public function run(): void
    {
        $albums = [
            [
                'title'       => 'Cabañas entre selva y mar',
                'slug'        => 'cabanas-entre-selva-y-mar',
                'description' => 'Rincones de descanso rodeados de vegetacion tropical, madera y brisa del Pacifico.',
                'category'    => GalleryCategory::Cabins,
                'featured'    => true,
                'sort_order'  => 1,
                'items'       => [
                    [
                        'url'     => '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
                        'alt'     => 'Cabañas nativas rodeadas de jardin tropical',
                        'caption' => 'Alojamiento tranquilo a pasos del mar.',
                    ],
                    [
                        'url'     => '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
                        'alt'     => 'Entrada a las cabañas con vegetacion tropical',
                        'caption' => 'Senderos sencillos para bajar el ritmo.',
                    ],
                ],
            ],
            [
                'title'       => 'Atardeceres de Playa Terco',
                'slug'        => 'atardeceres-playa-terco',
                'description' => 'Luz dorada, palmeras y tardes frente al Pacifico chocoano.',
                'category'    => GalleryCategory::Beach,
                'featured'    => false,
                'sort_order'  => 2,
                'items'       => [
                    [
                        'url'     => '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
                        'alt'     => 'Atardecer entre palmeras frente al Pacifico',
                        'caption' => 'Una tarde lenta mirando el horizonte.',
                    ],
                    [
                        'url'     => '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg',
                        'alt'     => 'Vista de Playa Terco y cabañas frente al mar',
                        'caption' => 'La playa como parte de la estadia.',
                    ],
                ],
            ],
        ];

        foreach ($albums as $albumData) {
            $album = GalleryAlbum::updateOrCreate(
                ['slug' => $albumData['slug']],
                [
                    'title'       => $albumData['title'],
                    'description' => $albumData['description'],
                    'category'    => $albumData['category'],
                    'is_active'   => true,
                    'is_featured' => $albumData['featured'],
                    'sort_order'  => $albumData['sort_order'],
                ],
            );

            $coverItem = null;

            foreach ($albumData['items'] as $index => $itemData) {
                $item = GalleryItem::updateOrCreate(
                    ['url' => $itemData['url']],
                    [
                        'gallery_album_id' => $album->id,
                        'thumbnail_url'    => $itemData['url'],
                        'alt'              => $itemData['alt'],
                        'caption'          => $itemData['caption'],
                        'category'         => $albumData['category'],
                        'type'             => 'image',
                        'mime_type'        => 'image/jpeg',
                        'sort_order'       => $index + 1,
                        'is_featured'      => $index === 0,
                        'is_active'        => true,
                    ],
                );

                $coverItem ??= $item;
            }

            if ($coverItem && ! $album->cover_gallery_item_id) {
                $album->update(['cover_gallery_item_id' => $coverItem->id]);
            }
        }
    }
}
