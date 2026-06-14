<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\EmailNotificationConfig;
use App\Services\EmailRecipientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EmailNotificationConfigController extends Controller
{
    protected EmailRecipientService $recipientService;

    public function __construct(EmailRecipientService $recipientService)
    {
        $this->recipientService = $recipientService;
    }

    /**
     * Get all email notification configs for a facility
     */
    public function index(Request $request, Facility $facility): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Only super_admin or facility admin/manager can access
        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $configs = EmailNotificationConfig::forFacility($facility->id)
            ->orderBy('module')
            ->orderBy('notification_type')
            ->get();

        return response()->json([
            'data' => $configs,
        ]);
    }

    /**
     * Get a specific notification config
     */
    public function show(Request $request, Facility $facility, string $notificationType): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $config = EmailNotificationConfig::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();

        if (!$config) {
            return response()->json(['message' => 'Config not found'], 404);
        }

        return response()->json([
            'data' => $config,
        ]);
    }

    /**
     * Create or update email notification config
     */
    public function update(Request $request, Facility $facility, string $notificationType): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $validated = $request->validate([
            'enabled' => 'nullable|boolean',
            'recipient_roles' => 'nullable|array',
            'recipient_roles.*' => 'string',
            'recipient_user_ids' => 'nullable|array',
            'recipient_user_ids.*' => 'integer|exists:users,id',
            'module' => 'nullable|string|max:255',
        ]);

        $config = EmailNotificationConfig::firstOrNew([
            'facility_id' => $facility->id,
            'notification_type' => $notificationType,
        ]);

        $config->enabled = $validated['enabled'] ?? $config->enabled ?? true;
        $config->recipient_roles = $validated['recipient_roles'] ?? $config->recipient_roles ?? [];
        $config->recipient_user_ids = $validated['recipient_user_ids'] ?? $config->recipient_user_ids ?? [];
        
        if (isset($validated['module'])) {
            $config->module = $validated['module'];
        }

        $config->save();

        Log::info('Email notification config updated', [
            'facility_id' => $facility->id,
            'notification_type' => $notificationType,
            'enabled' => $config->enabled,
        ]);

        return response()->json([
            'data' => $config,
            'message' => 'Email notification config updated successfully',
        ]);
    }

    /**
     * Bulk update multiple notification configs
     */
    public function bulkUpdate(Request $request, Facility $facility): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $validated = $request->validate([
            'configs' => 'required|array',
            'configs.*.notification_type' => 'required|string',
            'configs.*.enabled' => 'nullable|boolean',
            'configs.*.recipient_roles' => 'nullable|array',
            'configs.*.recipient_user_ids' => 'nullable|array',
            'configs.*.module' => 'nullable|string',
        ]);

        $updated = [];

        foreach ($validated['configs'] as $configData) {
            $config = EmailNotificationConfig::firstOrNew([
                'facility_id' => $facility->id,
                'notification_type' => $configData['notification_type'],
            ]);

            $config->enabled = $configData['enabled'] ?? $config->enabled ?? true;
            $config->recipient_roles = $configData['recipient_roles'] ?? $config->recipient_roles ?? [];
            $config->recipient_user_ids = $configData['recipient_user_ids'] ?? $config->recipient_user_ids ?? [];
            $config->module = $configData['module'] ?? $config->module;

            $config->save();
            $updated[] = $config;
        }

        return response()->json([
            'data' => $updated,
            'message' => 'Email notification configs updated successfully',
        ]);
    }
}

