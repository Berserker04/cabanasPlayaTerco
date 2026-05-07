<?php

namespace App\Models;

use App\Enums\PostStatus;
use App\Enums\PostType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'slug',
        'excerpt',
        'summary',
        'body',
        'featured_image',
        'cover_image_path',
        'status',
        'published_at',
        'visit_date',
        'travel_style',
        'media_count',
        'meta_title',
        'meta_description',
    ];

    protected function casts(): array
    {
        return [
            'status'       => PostStatus::class,
            'type'         => PostType::class,
            'published_at' => 'datetime',
            'visit_date'   => 'date',
            'media_count'  => 'integer',
        ];
    }

    // ── Relationships ──

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_post');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'post_tag');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function media(): HasMany
    {
        return $this->hasMany(PostMedia::class)->orderBy('sort_order');
    }

    // ── Scopes ──

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', PostStatus::Published)
                     ->whereNotNull('published_at')
                     ->where('published_at', '<=', now());
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', PostStatus::Draft);
    }

    public function scopeExperience(Builder $query): Builder
    {
        return $query->where('type', PostType::Experience);
    }
}
