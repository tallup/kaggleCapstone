<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FacilityRegistrationController;

// React App Route (serve React frontend)
Route::get('/app{any?}', function () {
    return spa_response();
})->where('any', '.*');

// Facility Registration Routes
Route::get('/register-facility', [FacilityRegistrationController::class, 'show'])->name('facility-registration.show');
Route::post('/register-facility', [FacilityRegistrationController::class, 'store'])->name('facility-registration.store');
Route::get('/register-facility/success', [FacilityRegistrationController::class, 'success'])->name('facility-registration.success');

// Public staff clock-in page (no authentication required)
// Serve at both paths for compatibility
Route::get('/staff/clock-in', function () {
    return spa_response();
})->name('public.staff.clock-in');

Route::get('/app/staff/clock-in', function () {
    return spa_response();
});

// Welcome page (public landing page)
Route::get('/', function () {
    return spa_response();
});

// Redirect /welcome to root for consistency
Route::get('/welcome', function () {
    return redirect('/');
});

Route::get('/login', function () {
    return spa_response();
})->name('login');

// Catch-all route for React Router - must be last
// This handles all client-side routes like /login, /features, /dashboard, etc.
Route::get('{any}', function () {
    return spa_response();
})->where('any', '.*');

