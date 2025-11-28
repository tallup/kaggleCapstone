<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeocodingController extends Controller
{
    /**
     * Geocode an address to coordinates
     */
    public function geocode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => 'required|string|max:1000',
        ]);

        $locationService = app(LocationService::class);
        $coordinates = $locationService->geocodeAddress($validated['address']);

        if ($coordinates) {
            return response()->json([
                'success' => true,
                'latitude' => $coordinates['latitude'],
                'longitude' => $coordinates['longitude'],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unable to geocode the address. Please try again or enter coordinates manually.',
        ], 422);
    }
}

