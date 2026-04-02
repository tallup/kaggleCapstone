<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Services\ModuleTestDataPurgeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TestDataPurgeController extends BaseApiController
{
    public function store(Request $request, ModuleTestDataPurgeService $purgeService): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();
        $isAdmin = $user && $user->isAnyAdmin();

        if ($this->isCaregiver($user)) {
            return response()->json([
                'message' => 'Test data purge is not available for caregiver accounts.',
            ], 403);
        }

        if (! $isSuperAdmin && ! $isAdmin) {
            return response()->json([
                'message' => 'Only facility administrators can purge test data across modules.',
            ], 403);
        }

        $moduleKeys = array_keys(Modules::all());

        $validated = $request->validate([
            'resident_ids' => 'required|array|min:1|max:100',
            'resident_ids.*' => 'integer|exists:residents,id',
            'modules' => 'required|array|min:1',
            'modules.*' => ['string', Rule::in($moduleKeys)],
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to' => 'nullable|date_format:Y-m-d',
            'facility_id' => 'nullable|integer|exists:facilities,id',
            'confirmation' => 'required|string|in:DELETE',
        ]);

        if ($isSuperAdmin && ! $user->facility_id && empty($validated['facility_id'])) {
            return response()->json([
                'message' => 'Super admin must pass facility_id to scope residents for this facility.',
            ], 422);
        }

        $facilityScope = $user->facility_id
            ? (int) $user->facility_id
            : (! empty($validated['facility_id']) ? (int) $validated['facility_id'] : null);

        $residentIds = array_values(array_unique(array_map('intval', $validated['resident_ids'])));
        $allowedIds = $this->resolveResidentIdsForBulk($request, $residentIds, $facilityScope);
        $rejected = array_values(array_diff($residentIds, $allowedIds));

        if ($rejected !== []) {
            return response()->json([
                'message' => 'Some residents are not in your facility or branch, or could not be found.',
                'invalid_resident_ids' => $rejected,
            ], 422);
        }

        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;

        if ($dateFrom && $dateTo) {
            $from = Carbon::createFromFormat('Y-m-d', $dateFrom, config('app.timezone'))->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', $dateTo, config('app.timezone'))->endOfDay();
            if ($from->gt($to)) {
                return response()->json(['message' => 'date_from must be on or before date_to.'], 422);
            }
        }

        $startDate = $dateFrom
            ? Carbon::createFromFormat('Y-m-d', $dateFrom, config('app.timezone'))->startOfDay()
            : null;
        $endDate = $dateTo
            ? Carbon::createFromFormat('Y-m-d', $dateTo, config('app.timezone'))->endOfDay()
            : null;

        $counts = $purgeService->purge($user, $allowedIds, $startDate, $endDate, $validated['modules']);

        return response()->json([
            'message' => 'Test data purge completed. Review counts per module below.',
            'counts' => $counts,
            'resident_ids' => $allowedIds,
        ]);
    }
}
