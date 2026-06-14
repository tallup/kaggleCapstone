<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EmailTemplateController extends Controller
{
    protected EmailTemplateService $templateService;

    public function __construct(EmailTemplateService $templateService)
    {
        $this->templateService = $templateService;
    }

    /**
     * Get all email templates for a facility
     */
    public function index(Request $request, Facility $facility): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $templates = EmailTemplate::forFacility($facility->id)
            ->orderBy('module')
            ->orderBy('notification_type')
            ->get();

        return response()->json([
            'data' => $templates,
        ]);
    }

    /**
     * Get a specific email template
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

        $template = EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();

        if (!$template) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        return response()->json([
            'data' => $template,
        ]);
    }

    /**
     * Create or update email template
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
            'subject_template' => 'required|string',
            'html_template' => 'required|string',
            'is_active' => 'nullable|boolean',
            'module' => 'nullable|string|max:255',
        ]);

        $template = EmailTemplate::firstOrNew([
            'facility_id' => $facility->id,
            'notification_type' => $notificationType,
        ]);

        $template->subject_template = $validated['subject_template'];
        $template->html_template = $validated['html_template'];
        $template->is_active = $validated['is_active'] ?? $template->is_active ?? true;
        
        if (isset($validated['module'])) {
            $template->module = $validated['module'];
        }

        $template->save();

        Log::info('Email template updated', [
            'facility_id' => $facility->id,
            'notification_type' => $notificationType,
            'is_active' => $template->is_active,
        ]);

        return response()->json([
            'data' => $template,
            'message' => 'Email template updated successfully',
        ]);
    }

    /**
     * Preview template with sample data
     */
    public function preview(Request $request, Facility $facility, string $notificationType): JsonResponse
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
            'sample_variables' => 'nullable|array',
        ]);

        $sampleVariables = $validated['sample_variables'] ?? [];

        $preview = $this->templateService->previewTemplate(
            $facility,
            $notificationType,
            $sampleVariables
        );

        return response()->json([
            'data' => $preview,
        ]);
    }

    /**
     * Delete a template (restore to default)
     */
    public function destroy(Request $request, Facility $facility, string $notificationType): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $template = EmailTemplate::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();

        if ($template) {
            $template->delete();

            Log::info('Email template deleted', [
                'facility_id' => $facility->id,
                'notification_type' => $notificationType,
            ]);
        }

        return response()->json([
            'message' => 'Template deleted successfully. System will use default template.',
        ]);
    }
}

