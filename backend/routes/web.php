<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Named fallback for unauthenticated requests. When the auth:sanctum middleware
// cannot resolve a user and the request is not Accept: application/json, Laravel
// redirects to route('login'). Returning JSON 401 keeps the API contract
// consistent and avoids a RouteNotFoundException / 500.
Route::get('/login', function (Request $request) {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');
