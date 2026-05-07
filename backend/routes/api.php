<?php

use App\Http\Controllers\Api;
use App\Http\Controllers\Admin;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Endpoints
|--------------------------------------------------------------------------
*/

// ── Auth ─────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [Api\AuthController::class, 'register'])
        ->middleware('throttle:3,1');

    Route::post('/login', [Api\AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::post('/forgot-password', [Api\AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [Api\AuthController::class, 'resetPassword']);

    Route::get('/google/redirect', [Api\AuthController::class, 'googleRedirect'])
        ->middleware('web');
    Route::get('/google/callback', [Api\AuthController::class, 'googleCallback'])
        ->middleware('web');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [Api\AuthController::class, 'logout']);
        Route::get('/user', [Api\AuthController::class, 'user']);
        Route::put('/profile', [Api\AuthController::class, 'updateProfile']);
        Route::put('/password', [Api\AuthController::class, 'updatePassword']);
    });
});

// ── Cabins ───────────────────────────────────────────────────
Route::get('/cabins', [Api\CabinController::class, 'index']);
Route::get('/cabins/{cabin:slug}', [Api\CabinController::class, 'show']);
Route::get('/lodging-tariffs', [Api\LodgingTariffController::class, 'index']);

// ── Gallery ──────────────────────────────────────────────────
Route::get('/gallery/albums', [Api\GalleryAlbumController::class, 'index']);
Route::get('/gallery/albums/{galleryAlbum:slug}', [Api\GalleryAlbumController::class, 'show']);
Route::get('/gallery', [Api\GalleryController::class, 'index']);

// ── Reviews ──────────────────────────────────────────────────
Route::get('/reviews', [Api\ReviewController::class, 'index']);
Route::get('/reviews/latest', [Api\ReviewController::class, 'latest']);
Route::post('/reviews', [Api\ReviewController::class, 'store'])
    ->middleware('auth:sanctum');

Route::prefix('me')
    ->middleware('auth:sanctum')
    ->group(function () {
        Route::get('/reviews', [Api\MeReviewController::class, 'index']);
        Route::put('/reviews/{review}', [Api\MeReviewController::class, 'update']);
        Route::delete('/reviews/{review}', [Api\MeReviewController::class, 'destroy']);
        Route::post('/reviews/{review}/media', [Api\MeReviewController::class, 'storeMedia']);
        Route::delete('/reviews/{review}/media/{media}', [Api\MeReviewController::class, 'destroyMedia']);
        Route::get('/posts', [Api\MePostController::class, 'index']);
        Route::post('/posts/media', [Api\MePostController::class, 'storeMedia']);
        Route::post('/posts', [Api\MePostController::class, 'store']);
        Route::put('/posts/{post}', [Api\MePostController::class, 'update']);
        Route::delete('/posts/{post}', [Api\MePostController::class, 'destroy']);
    });

// ── Blog ─────────────────────────────────────────────────────
Route::get('/posts', [Api\PostController::class, 'index']);
Route::get('/posts/{post:slug}', [Api\PostController::class, 'show']);
Route::get('/categories', [Api\PostController::class, 'categories']);
Route::get('/tags', [Api\PostController::class, 'tags']);
Route::post('/posts/{post}/comments', [Api\PostController::class, 'storeComment'])
    ->middleware('auth:sanctum');

// ── Availability ─────────────────────────────────────────────
Route::get('/availability', [Api\AvailabilityController::class, 'check']);
Route::get('/availability/calendar', [Api\AvailabilityController::class, 'calendar']);

// ── Contact ──────────────────────────────────────────────────
Route::post('/contact', [Api\ContactController::class, 'store'])
    ->middleware('throttle:3,60');

/*
|--------------------------------------------------------------------------
| Admin Endpoints
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function () {

        // ── Dashboard ────────────────────────────────────────
        Route::get('/dashboard/stats', [Admin\DashboardController::class, 'stats']);

        // ── Cabin Types ──────────────────────────────────────
        Route::apiResource('cabin-types', Admin\CabinTypeController::class);

        // ── Cabins ───────────────────────────────────────────
        Route::apiResource('cabins', Admin\CabinController::class);
        Route::post('/cabins/{cabin}/cover', [Admin\CabinController::class, 'uploadCover']);

        // ── Lodging Tariffs ──────────────────────────────────
        Route::apiResource('lodging-tariffs', Admin\LodgingTariffController::class)
            ->except(['show'])
            ->parameter('lodging-tariffs', 'lodgingTariff');

        // ── Cabin Media ──────────────────────────────────────
        Route::post('/cabin-media', [Admin\CabinMediaController::class, 'store']);
        Route::put('/cabin-media/{cabinMedia}', [Admin\CabinMediaController::class, 'update']);
        Route::delete('/cabin-media/{cabinMedia}', [Admin\CabinMediaController::class, 'destroy']);

        // ── Amenities ────────────────────────────────────────
        Route::get('/amenities', [Admin\AmenityController::class, 'index']);
        Route::post('/amenities', [Admin\AmenityController::class, 'store']);
        Route::put('/amenities/{amenity}', [Admin\AmenityController::class, 'update']);
        Route::delete('/amenities/{amenity}', [Admin\AmenityController::class, 'destroy']);

        // ── Availability & Reservations ──────────────────────
        Route::get('/availability', Admin\AvailabilityController::class);
        Route::apiResource('availability-blocks', Admin\AvailabilityBlockController::class)
            ->parameter('availability-blocks', 'availability_block');
        Route::get('/reservations/occupancy', [Admin\ReservationController::class, 'occupancy']);
        Route::apiResource('reservations', Admin\ReservationController::class)->except(['show']);

        // ── Reviews ──────────────────────────────────────────
        Route::get('/reviews', [Admin\ReviewController::class, 'index']);
        Route::put('/reviews/{review}', [Admin\ReviewController::class, 'update']);
        Route::delete('/reviews/{review}', [Admin\ReviewController::class, 'destroy']);

        // ── Posts ────────────────────────────────────────────
        Route::apiResource('posts', Admin\PostController::class);

        // ── Comments ─────────────────────────────────────────
        Route::get('/comments', [Admin\CommentController::class, 'index']);
        Route::put('/comments/{comment}', [Admin\CommentController::class, 'update']);
        Route::delete('/comments/{comment}', [Admin\CommentController::class, 'destroy']);

        // ── Guest Groups ─────────────────────────────────────
        Route::get('/guest-groups/export', [Admin\GuestGroupController::class, 'export']);
        Route::apiResource('guest-groups', Admin\GuestGroupController::class)->except(['destroy']);
        Route::post('/guest-groups/{guestGroup}/members', [Admin\GuestGroupController::class, 'addMember']);
        Route::post('/guest-groups/{guestGroup}/documents', [Admin\GuestGroupController::class, 'uploadDocument']);

        // ── Guest Members ────────────────────────────────────
        Route::put('/guest-members/{guestMember}', [Admin\GuestMemberController::class, 'update']);
        Route::delete('/guest-members/{guestMember}', [Admin\GuestMemberController::class, 'destroy']);

        // ── Payments ─────────────────────────────────────────
        Route::get('/payments/summary', [Admin\PaymentController::class, 'summary']);
        Route::apiResource('payments', Admin\PaymentController::class)->except(['show', 'destroy']);

        // ── Staff ────────────────────────────────────────────
        Route::get('/staff-payments/summary', [Admin\StaffController::class, 'paymentsSummary']);
        Route::apiResource('staff', Admin\StaffController::class);
        Route::post('/staff/{staff}/payments', [Admin\StaffController::class, 'storePayment']);
        Route::get('/staff/{staff}/payments', [Admin\StaffController::class, 'payments']);

        // ── Leads ────────────────────────────────────────────
        Route::get('/leads', [Admin\LeadController::class, 'index']);
        Route::put('/leads/{lead}', [Admin\LeadController::class, 'update']);

        // ── Users ────────────────────────────────────────────
        Route::get('/users', [Admin\UserController::class, 'index']);
        Route::put('/users/{user}', [Admin\UserController::class, 'update']);

        // ── Gallery ──────────────────────────────────────────
        Route::apiResource('gallery-albums', Admin\GalleryAlbumController::class)
            ->parameter('gallery-albums', 'gallery_album');

        Route::apiResource('gallery', Admin\GalleryController::class)
            ->parameter('gallery', 'galleryItem');
    });
