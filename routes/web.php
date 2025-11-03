<?php

use Illuminate\Support\Facades\Route;

// React App Route (serve React frontend)
Route::get('/app{any?}', function () {
    return view('react-app');
})->where('any', '.*');

// Redirect root to React app login
Route::get('/', function () {
    return redirect('/app/login');
});
