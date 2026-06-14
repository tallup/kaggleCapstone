<?php

namespace App\Http\Controllers\Api;

use App\Models\Assessment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AssessmentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $query = Assessment::with(['resident', 'branch', 'assessor']);

        // Apply facility filtering for non-super admins
        $currentUser = Auth::user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            // Filter assessments by branches that belong to the user's facility
            if ($currentUser->facility_id) {
                // Use optimized whereIn pattern instead of whereHas for better performance
                $branchIds = $this->getFacilityBranchIds($currentUser->facility_id);
                if (! empty($branchIds)) {
                    $query->whereIn('branch_id', $branchIds);
                } else {
                    // No branches for facility, return empty results
                    return response()->json([
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $request->get('per_page', 20),
                        'total' => 0,
                    ]);
                }
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 20),
                    'total' => 0,
                ]);
            }
        }

        // Apply branch filter for caregivers (using the helper method from BaseApiController)
        $this->applyBranchFilter($query, $request, $currentUser);

        // Filter by status
        if ($request->has('status') && ! empty($request->get('status'))) {
            $query->where('status', $request->get('status'));
        }

        // Filter by type
        if ($request->has('assessment_type') && ! empty($request->get('assessment_type'))) {
            $query->where('assessment_type', $request->get('assessment_type'));
        }

        // Filter by resident
        if ($request->has('resident_id') && ! empty($request->get('resident_id'))) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Note: Branch filtering is handled by applyBranchFilter() above
        // The facility filter ensures only branches from the user's facility are accessible

        // Filter by date
        if ($request->has('date_from')) {
            $query->whereDate('assessment_date', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->whereDate('assessment_date', '<=', $request->get('date_to'));
        }

        // Filter by today
        if ($request->has('today') && $request->get('today') === 'true') {
            $query->whereDate('assessment_date', today());
        }

        // Search
        if ($request->has('search') && ! empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('assessment_type', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $assessments = $query->orderBy('assessment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($assessments);
    }

    public function show($id): JsonResponse
    {
        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $assessment = Assessment::with(['resident', 'branch', 'assessor', 'sections.questions'])
            ->findOrFail($id);

        // Check facility access for non-super admins
        $currentUser = Auth::user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            if ($currentUser->facility_id) {
                // Verify the assessment's branch belongs to the user's facility
                if (! $assessment->branch || $assessment->branch->facility_id !== $currentUser->facility_id) {
                    return response()->json(['message' => 'Assessment not found'], 404);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'Assessment not found'], 404);
            }
        }

        // If no sections exist, create default sections and questions (admin workflow only; avoids writes on caregiver views)
        if ($assessment->sections()->count() === 0 && ! $this->isCaregiver($currentUser)) {
            $this->createDefaultSections($assessment);
            $assessment->refresh();
            $assessment->load(['sections.questions']);
        }

        // Ensure section_title accessor is included for each section
        $assessment->sections->each(function ($section) {
            if (method_exists($section, 'getSectionTitleAttribute')) {
                $section->append('section_title');
            }
        });

        return response()->json($assessment);
    }

    private function createDefaultSections(Assessment $assessment): void
    {
        $defaultSections = [
            'demographic' => [
                'Demographic Information',
                [
                    ['What is the resident\'s age?', 'number'],
                    ['What is the resident\'s gender?', 'select', ['Male', 'Female', 'Other']],
                    ['What is the resident\'s primary language?', 'text'],
                    ['Is the resident currently married?', 'yes_no'],
                    ['What is the resident\'s highest level of education?', 'select', ['Elementary', 'High School', 'College', 'Graduate', 'Other']],
                ],
            ],
            'medical_history' => [
                'Medical History',
                [
                    ['Does the resident have any chronic conditions?', 'yes_no'],
                    ['List current medications:', 'textarea'],
                    ['Does the resident have any known allergies?', 'yes_no'],
                    ['What allergies are present?', 'textarea'],
                    ['Has the resident had any recent surgeries?', 'yes_no'],
                ],
            ],
            'functional' => [
                'Functional Assessment',
                [
                    ['Can the resident walk independently?', 'yes_no'],
                    ['Can the resident perform activities of daily living (ADLs) independently?', 'yes_no'],
                    ['Can the resident transfer from bed to chair independently?', 'yes_no'],
                    ['Can the resident bathe independently?', 'yes_no'],
                    ['Can the resident dress independently?', 'yes_no'],
                ],
            ],
            'cognitive' => [
                'Cognitive Assessment',
                [
                    ['Is the resident alert and oriented?', 'yes_no'],
                    ['Does the resident show signs of memory impairment?', 'yes_no'],
                    ['Can the resident make decisions independently?', 'yes_no'],
                    ['Has the resident been diagnosed with dementia or Alzheimer\'s?', 'yes_no'],
                    ['Describe cognitive abilities:', 'textarea'],
                ],
            ],
            'behavioral' => [
                'Behavioral Assessment',
                [
                    ['Does the resident display any challenging behaviors?', 'yes_no'],
                    ['Describe any behavioral concerns:', 'textarea'],
                    ['Is the resident cooperative with care?', 'yes_no'],
                    ['Does the resident require redirection?', 'yes_no'],
                ],
            ],
        ];

        foreach ($defaultSections as $sectionType => [$sectionTitle, $questions]) {
            $section = \App\Models\AssessmentSection::create([
                'assessment_id' => $assessment->id,
                'section_type' => $sectionType,
                'is_completed' => false,
            ]);

            foreach ($questions as $index => $questionData) {
                \App\Models\AssessmentQuestion::create([
                    'assessment_section_id' => $section->id,
                    'question_text' => $questionData[0],
                    'response_type' => $questionData[1] ?? 'text',
                    'response_options' => isset($questionData[2]) ? $questionData[2] : null,
                    'response_value' => null,
                    'weight' => 1,
                ]);
            }
        }
    }

    public function store(Request $request): JsonResponse
    {
        if ($response = $this->forbidCaregiverMutation()) {
            return $response;
        }

        $user = auth()->user();

        // Allow administrators and super admins to create assessments even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('create_assessments')) {
                return $error;
            }
        }

        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'required|exists:branches,id',
            'assessment_type' => 'required|string|max:255',
            'assessment_date' => 'required|date',
            'status' => 'nullable|in:draft,in_progress,completed,reviewed,approved,archived',
            'notes' => 'nullable|string',
            'scores' => 'nullable|array',
            'recommendations' => 'nullable|array',
        ]);

        $validated['assessor_id'] = auth()->id();
        $validated['status'] = $validated['status'] ?? 'draft';

        if ($validated['status'] === 'completed') {
            $validated['completed_at'] = Carbon::now();
        }

        $assessment = Assessment::create($validated);

        return response()->json($assessment->load(['resident', 'branch', 'assessor']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($response = $this->forbidCaregiverMutation()) {
            return $response;
        }

        $user = auth()->user();

        // Allow administrators and super admins to edit assessments even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('edit_assessments')) {
                return $error;
            }
        }

        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'sometimes|exists:branches,id',
            'assessment_type' => 'sometimes|string|max:255',
            'assessment_date' => 'sometimes|date',
            'status' => 'sometimes|in:draft,in_progress,completed,reviewed,approved,archived',
            'notes' => 'nullable|string',
            'scores' => 'nullable|array',
            'recommendations' => 'nullable|array',
        ]);

        // Update timestamps based on status
        if (isset($validated['status'])) {
            if ($validated['status'] === 'completed' && ! $assessment->completed_at) {
                $validated['completed_at'] = Carbon::now();
            }
            if ($validated['status'] === 'reviewed' && ! $assessment->reviewed_at) {
                $validated['reviewed_at'] = Carbon::now();
            }
            if ($validated['status'] === 'approved' && ! $assessment->approved_at) {
                $validated['approved_at'] = Carbon::now();
            }
        }

        $assessment->update($validated);

        return response()->json($assessment->load(['resident', 'branch', 'assessor']));
    }

    public function destroy($id): JsonResponse
    {
        if ($response = $this->forbidCaregiverMutation()) {
            return $response;
        }

        $user = auth()->user();

        // Allow administrators and super admins to delete assessments even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_assessments')) {
                return $error;
            }
        }

        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $assessment = Assessment::findOrFail($id);
        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted successfully']);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        if ($response = $this->forbidCaregiverMutation()) {
            return $response;
        }

        // Check module access
        $moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS);
        if ($moduleAccessError) {
            return $moduleAccessError;
        }

        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:draft,in_progress,completed,reviewed,approved,archived',
        ]);

        $status = $validated['status'];

        // Update timestamps based on status
        if ($status === 'completed' && ! $assessment->completed_at) {
            $assessment->completed_at = Carbon::now();

            // Calculate and save scores when marking as completed
            try {
                $calculatedScores = $assessment->calculateScores();
                $assessment->scores = $calculatedScores;
            } catch (\Exception $e) {
                \Log::error('Failed to calculate assessment scores: '.$e->getMessage());
                // Continue even if score calculation fails
            }

            // Notify admins
            try {
                $admins = \App\Models\User::where(function ($query) {
                    $query->whereIn('role', ['admin', 'administrator', 'super_admin']);
                })
                    ->orWhereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'administrator', 'super_admin']))
                    ->get();

                app(\App\Services\NotificationService::class)->sendAssessmentEmail(
                    $assessment,
                    $admins,
                    'completed'
                );
            } catch (\Exception $e) {
                \Log::error('Failed to trigger assessment notification', ['error' => $e->getMessage()]);
            }
        }
        if ($status === 'reviewed' && ! $assessment->reviewed_at) {
            $assessment->reviewed_at = Carbon::now();
        }
        if ($status === 'approved' && ! $assessment->approved_at) {
            $assessment->approved_at = Carbon::now();
        }

        $assessment->status = $status;
        $assessment->save();

        return response()->json($assessment->load(['resident', 'branch', 'assessor']));
    }
}
