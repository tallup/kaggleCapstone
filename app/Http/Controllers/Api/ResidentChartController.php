<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviorChart;
use App\Models\BehaviorChartItem;
use App\Models\BehaviorChartLog;
use App\Models\BehaviorDefinition;
use App\Models\Resident;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResidentChartController extends BaseApiController
{
    /**
     * Get the charting status and current record for a resident today.
     */
    public function show(Resident $resident): JsonResponse
    {
        $today = Carbon::today()->toDateString();
        
        $chart = BehaviorChart::with(['items', 'logs'])
            ->where('resident_id', $resident->id)
            ->where('chart_date', $today)
            ->first();

        // Also fetch all active behavior definitions to show in the "New Chart" modal
        $definitions = BehaviorDefinition::with('category')
            ->where('is_active', true)
            ->get()
            ->groupBy('behavior_category_id');

        return response()->json([
            'resident' => $resident,
            'chart' => $chart,
            'is_pending' => $chart && $chart->status === 'draft',
            'is_submitted' => $chart && $chart->status === 'submitted',
        ]);
    }

    /**
     * Store or update a behavior chart for a resident.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'chart_date' => 'required|date',
            'status' => 'required|in:draft,submitted',
            'items' => 'required|array',
            'items.*.behavior_definition_id' => 'required|exists:behavior_definitions,id',
            'items.*.value' => 'required|boolean',
            'logs' => 'nullable|array',
            'logs.*.occurred_at' => 'required|date',
            'logs.*.behavior_description' => 'required|string',
            'logs.*.triggers' => 'nullable|string',
            'logs.*.caregiver_intervention' => 'nullable|string',
            'logs.*.reported_to_provider' => 'required|boolean',
            'logs.*.outcome' => 'nullable|string',
        ]);

        $user = $request->user();
        $chartDate = Carbon::parse($request->chart_date)->toDateString();
        
        // Time validation for submission
        if ($request->status === 'submitted') {
            $now = Carbon::now();
            $hour = $now->hour;
            $minute = $now->minute;
            
            // 7:00 PM (19:00) to 9:59 PM (21:59)
            if ($hour < 19 || $hour > 21) {
                return response()->json([
                    'message' => 'Entries are only permitted between 7:00 PM and 9:59 PM.',
                    'errors' => ['time' => ['Entries are only permitted between 7:00 PM and 9:59 PM.']]
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $user, $chartDate) {
            $chart = BehaviorChart::updateOrCreate(
                [
                    'resident_id' => $request->resident_id,
                    'chart_date' => $chartDate,
                ],
                [
                    'caregiver_id' => $user->id,
                    'status' => $request->status,
                    'submitted_at' => $request->status === 'submitted' ? Carbon::now() : null,
                ]
            );

            // Sync items
            $chart->items()->delete();
            foreach ($request->items as $item) {
                $chart->items()->create([
                    'behavior_definition_id' => $item['behavior_definition_id'],
                    'value' => $item['value'],
                ]);
            }

            // Sync logs
            $chart->logs()->delete();
            if ($request->has('logs')) {
                foreach ($request->logs as $log) {
                    $chart->logs()->create([
                        'occurred_at' => $log['occurred_at'],
                        'behavior_description' => $log['behavior_description'],
                        'triggers' => $log['triggers'] ?? null,
                        'caregiver_intervention' => $log['caregiver_intervention'] ?? null,
                        'reported_to_provider' => $log['reported_to_provider'],
                        'outcome' => $log['outcome'] ?? null,
                    ]);
                }
            }

            return response()->json([
                'message' => 'Chart saved successfully.',
                'chart' => $chart->load(['items', 'logs']),
            ]);
        });
    }

    /**
     * Get charting history for a resident.
     */
    public function history(Resident $resident): JsonResponse
    {
        $history = BehaviorChart::with(['items', 'logs', 'caregiver'])
            ->where('resident_id', $resident->id)
            ->where('status', 'submitted')
            ->orderBy('chart_date', 'desc')
            ->paginate(15);

        return response()->json($history);
    }
}
