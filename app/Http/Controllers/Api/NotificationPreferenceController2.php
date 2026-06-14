<?php

namespace App\Http\Controllers\Api;

use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController2 extends BaseApiController
{
    /**
     * Get all notification preferences for the current user.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $preferences = NotificationPreference::where('user_id', $user->id)->get()
            ->keyBy('notification_type');

        $categories = NotificationPreference::configurableTypes();

        // Build response: for each category, show current preference state
        $result = [];
        foreach ($categories as $key => $category) {
            // Use the first type in the group to determine the preference
            $pref = $preferences->get($key);
            $result[] = [
                'key' => $key,
                'label' => $category['label'],
                'description' => $category['description'],
                'in_app_enabled' => $pref?->in_app_enabled ?? true,
                'email_enabled' => $pref?->email_enabled ?? true,
                'push_enabled' => $pref?->push_enabled ?? true,
            ];
        }

        return response()->json(['preferences' => $result]);
    }

    /**
     * Update notification preferences for the current user.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'preferences' => 'required|array',
            'preferences.*.key' => 'required|string',
            'preferences.*.in_app_enabled' => 'required|boolean',
            'preferences.*.email_enabled' => 'required|boolean',
            'preferences.*.push_enabled' => 'required|boolean',
        ]);

        $user = auth()->user();

        foreach ($request->preferences as $pref) {
            NotificationPreference::updateOrCreate(
                ['user_id' => $user->id, 'notification_type' => $pref['key']],
                [
                    'in_app_enabled' => $pref['in_app_enabled'],
                    'email_enabled' => $pref['email_enabled'],
                    'push_enabled' => $pref['push_enabled'],
                ]
            );
        }

        return response()->json(['message' => 'Preferences updated']);
    }
}
