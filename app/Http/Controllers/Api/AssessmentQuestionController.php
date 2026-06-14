<?php

namespace App\Http\Controllers\Api;

use App\Models\Assessment;
use App\Models\AssessmentQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentQuestionController extends BaseApiController
{
    public function update(Request $request, Assessment $assessment, AssessmentQuestion $question): JsonResponse
    {
        if ($response = $this->forbidCaregiverMutation()) {
            return $response;
        }

        if ($moduleAccessError = $this->requireModuleAccess(\App\Constants\Modules::ASSESSMENTS)) {
            return $moduleAccessError;
        }

        if (! $this->checkBranchAccess($assessment)) {
            return response()->json(['message' => 'Assessment not found'], 404);
        }

        // Soft-check that the question belongs to this assessment (avoid hard failures)
        $section = $question->section()->first();
        if ($section && (int) $section->assessment_id !== (int) $assessment->id) {
            return response()->json(['message' => 'Question does not belong to this assessment.'], 403);
        }

        $validated = $request->validate([
            'response_value' => 'nullable',
            'notes' => 'nullable|string',
        ]);

        // Normalize the response value to a string to ensure persistence in TEXT column
        if (array_key_exists('response_value', $validated)) {
            $value = $validated['response_value'];
            if (is_bool($value)) {
                $validated['response_value'] = $value ? 'true' : 'false';
            } elseif (is_array($value)) {
                $validated['response_value'] = json_encode($value);
            } elseif (is_null($value)) {
                $validated['response_value'] = null;
            } else {
                $validated['response_value'] = (string) $value;
            }
        }

        $question->update($validated);

        return response()->json($question->fresh(['section']));
    }
}
