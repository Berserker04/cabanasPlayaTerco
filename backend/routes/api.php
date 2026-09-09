<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Api;
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

    Route::post('/mobile/login', [Api\MobileAuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::post('/mobile/register', [Api\MobileAuthController::class, 'register'])
        ->middleware('throttle:3,1');

    Route::post('/mobile/google', [Api\MobileAuthController::class, 'google'])
        ->middleware('throttle:5,1');

    Route::post('/forgot-password', [Api\AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [Api\AuthController::class, 'resetPassword']);

    Route::get('/google/redirect', [Api\AuthController::class, 'googleRedirect'])
        ->middleware('web');
    Route::get('/google/callback', [Api\AuthController::class, 'googleCallback'])
        ->middleware('web');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [Api\AuthController::class, 'logout']);
        Route::post('/mobile/logout', [Api\MobileAuthController::class, 'logout']);

        Route::middleware('active')->group(function () {
            Route::get('/user', [Api\AuthController::class, 'user']);
            Route::put('/profile', [Api\AuthController::class, 'updateProfile']);
            Route::put('/password', [Api\AuthController::class, 'updatePassword']);
        });
    });
});

// ── Cabins ───────────────────────────────────────────────────
Route::get('/cabin-map-points', [Admin\CabinMapPointController::class, 'publicIndex']);
Route::get('/cabins', [Api\CabinController::class, 'index']);
Route::get('/cabins/{cabin:slug}', [Api\CabinController::class, 'show']);
Route::get('/amenities', [Api\AmenityController::class, 'index']);
Route::get('/lodging-tariffs', [Api\LodgingTariffController::class, 'index']);

// ── Gallery ──────────────────────────────────────────────────
Route::get('/gallery/albums', [Api\GalleryAlbumController::class, 'index']);
Route::get('/gallery/albums/{galleryAlbum:slug}', [Api\GalleryAlbumController::class, 'show']);
Route::get('/gallery', [Api\GalleryController::class, 'index']);

// ── Reviews ──────────────────────────────────────────────────
Route::get('/reviews', [Api\ReviewController::class, 'index']);
Route::get('/reviews/latest', [Api\ReviewController::class, 'latest']);
Route::post('/reviews', [Api\ReviewController::class, 'store'])
    ->middleware(['auth:sanctum', 'active']);

Route::prefix('me')
    ->middleware(['auth:sanctum', 'active'])
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
    ->middleware(['auth:sanctum', 'active']);

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
    ->middleware(['auth:sanctum', 'active', 'panel'])
    ->group(function () {

        // ── Dashboard ────────────────────────────────────────
        Route::get('/dashboard/stats', [Admin\DashboardController::class, 'stats']);
        Route::get('/dashboard/operations', [Admin\DashboardController::class, 'operations']);

        // ── Cabin Types ──────────────────────────────────────
        Route::apiResource('cabin-types', Admin\CabinTypeController::class)
            ->only(['index', 'show']);
        Route::apiResource('cabin-types', Admin\CabinTypeController::class)
            ->except(['index', 'show'])
            ->middleware('admin');

        Route::get('/cabin-map-points', [Admin\CabinMapPointController::class, 'index']);
        Route::apiResource('cabin-map-points', Admin\CabinMapPointController::class)->parameter('cabin-map-points', 'cabinMapPoint')->except(['index', 'show'])->middleware('admin');
        Route::post('/cabins/{id}/restore', [Admin\CabinController::class, 'restore'])->whereNumber('id')->middleware('admin');
        Route::delete('/cabins/{cabin}/cover', [Admin\CabinController::class, 'deleteCover'])->middleware('admin');

        // ── Cabins ───────────────────────────────────────────
        Route::apiResource('cabins', Admin\CabinController::class)
            ->only(['index', 'show']);
        Route::apiResource('cabins', Admin\CabinController::class)
            ->except(['index', 'show'])
            ->middleware('admin');
        Route::post('/cabins/{cabin}/cover', [Admin\CabinController::class, 'uploadCover'])
            ->middleware('admin');

        // ── Lodging Tariffs ──────────────────────────────────
        Route::apiResource('lodging-tariffs', Admin\LodgingTariffController::class)
            ->only(['index']);
        Route::apiResource('lodging-tariffs', Admin\LodgingTariffController::class)
            ->except(['index', 'show'])
            ->parameter('lodging-tariffs', 'lodgingTariff')
            ->middleware('admin');

        // ── Cabin Media ──────────────────────────────────────
        Route::post('/cabin-media', [Admin\CabinMediaController::class, 'store'])->middleware('admin');
        Route::put('/cabin-media/{cabinMedia}', [Admin\CabinMediaController::class, 'update'])->middleware('admin');
        Route::delete('/cabin-media/{cabinMedia}', [Admin\CabinMediaController::class, 'destroy'])->middleware('admin');

        // ── Amenities ────────────────────────────────────────
        Route::get('/amenities', [Admin\AmenityController::class, 'index']);
        Route::post('/amenities', [Admin\AmenityController::class, 'store'])->middleware('admin');
        Route::put('/amenities/{amenity}', [Admin\AmenityController::class, 'update'])->middleware('admin');
        Route::delete('/amenities/{amenity}', [Admin\AmenityController::class, 'destroy'])->middleware('admin');

        // ── Availability & Reservations ──────────────────────
        Route::get('/availability/calendar', [Admin\AvailabilityController::class, 'calendar']);
        Route::get('/availability/agenda', [Admin\AvailabilityController::class, 'agenda']);
        Route::get('/availability/planner', [Admin\AvailabilityController::class, 'planner']);
        Route::get('/availability', Admin\AvailabilityController::class);
        Route::apiResource('availability-blocks', Admin\AvailabilityBlockController::class)
            ->parameter('availability-blocks', 'availability_block');
        Route::get('/reservations/occupancy', [Admin\ReservationController::class, 'occupancy']);
        Route::apiResource('reservations', Admin\ReservationController::class);

        // ── Reviews ──────────────────────────────────────────
        Route::get('/reviews', [Admin\ReviewController::class, 'index'])->middleware('admin');
        Route::put('/reviews/{review}', [Admin\ReviewController::class, 'update'])->middleware('admin');
        Route::delete('/reviews/{review}', [Admin\ReviewController::class, 'destroy'])->middleware('admin');

        // ── Posts ────────────────────────────────────────────
        Route::apiResource('posts', Admin\PostController::class)
            ->middleware('admin');

        // ── Comments ─────────────────────────────────────────
        Route::get('/comments', [Admin\CommentController::class, 'index'])->middleware('admin');
        Route::put('/comments/{comment}', [Admin\CommentController::class, 'update'])->middleware('admin');
        Route::delete('/comments/{comment}', [Admin\CommentController::class, 'destroy'])->middleware('admin');

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

        // ── Simple Cashbox ───────────────────────────────────
        Route::get('/finance/summary', [Admin\FinanceController::class, 'summary']);
        Route::get('/expenses/summary', [Admin\ExpenseController::class, 'summary']);
        Route::apiResource('expenses', Admin\ExpenseController::class);

        // ── Staff ────────────────────────────────────────────
        Route::get('/staff/options', [Admin\StaffController::class, 'options']);
        Route::get('/staff-payments/summary', [Admin\StaffController::class, 'paymentsSummary'])->middleware('admin');
        Route::apiResource('staff', Admin\StaffController::class)->middleware('admin');
        Route::post('/staff/{staff}/payments', [Admin\StaffController::class, 'storePayment'])->middleware('admin');
        Route::get('/staff/{staff}/payments', [Admin\StaffController::class, 'payments'])->middleware('admin');

        // ── Leads ────────────────────────────────────────────
        Route::get('/leads', [Admin\LeadController::class, 'index']);
        Route::put('/leads/{lead}', [Admin\LeadController::class, 'update']);

        // ── Users ────────────────────────────────────────────
        Route::get('/users', [Admin\UserController::class, 'index'])->middleware('admin');
        Route::put('/users/{user}', [Admin\UserController::class, 'update'])->middleware('admin');

        // ── Gallery ──────────────────────────────────────────
        Route::apiResource('gallery-albums', Admin\GalleryAlbumController::class)
            ->parameter('gallery-albums', 'gallery_album')
            ->middleware('admin');

        Route::apiResource('gallery', Admin\GalleryController::class)
            ->parameter('gallery', 'galleryItem')
            ->middleware('admin');
    });
