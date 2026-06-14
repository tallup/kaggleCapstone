<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushSubscriptionController extends Controller
{
    /**
     * Store a push subscription for the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:500',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
            'content_encoding' => 'nullable|string|in:aesgcm,aes128gcm',
        ]);

        $user = $request->user();
        $endpoint = $validated['endpoint'];
        $contentEncoding = $validated['content_encoding'] ?? 'aes128gcm';

        $subscription = PushSubscription::updateOrCreate(
            ['endpoint' => $endpoint],
            [
                'user_id' => $user->id,
                'public_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
                'content_encoding' => $contentEncoding,
            ]
        );

        Log::info("[PushSubscription] Stored for user {$user->id}");

        return response()->json([
            'message' => 'Push subscription saved.',
            'subscription' => ['id' => $subscription->id],
        ], 201);
    }

    /**
     * Remove a push subscription (by endpoint).
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $deleted = PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $request->input('endpoint'))
            ->delete();

        if ($deleted) {
            Log::info('[PushSubscription] Removed for user ' . $request->user()->id);
        }

        return response()->json(['message' => 'Push subscription removed.'], 200);
    }
}
