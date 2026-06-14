<?php

namespace App\Http\Controllers\Api;

use App\Models\BehaviorChart;
use App\Models\BehaviorDefinition;
use App\Models\Resident;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResidentChartController extends BaseApiController
{
    /**
     * List all behavior charts with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BehaviorChart::with([
            'resident.branch',
            'caregiver',
            'items.definition.category',
            'logs',
        ])
            ->whereIn('status', ['submitted', 'approved', 'declined', 'pending'])
            ->orderBy('chart_date', 'desc')
            ->orderBy('submitted_at', 'desc');

        // Filter by branch
        if ($request->has('branch_id') && $request->branch_id) {
            $query->whereHas('resident', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        // Filter by resident
        if ($request->has('resident_id') && $request->resident_id) {
            $query->where('resident_id', $request->resident_id);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->where('chart_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('chart_date', '<=', $request->date_to);
        }

        // Filter by month/year
        if ($request->has('month') && $request->month) {
            $query->whereMonth('chart_date', $request->month);
        }

        if ($request->has('year') && $request->year) {
            $query->whereYear('chart_date', $request->year);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 15)));
        $charts = $query->paginate($perPage);

        return response()->json($charts);
    }

    /**
     * Get the charting status and current record for a resident for a given date (default: today).
     */
    public function show(Request $request, Resident $resident): JsonResponse
    {
        $date = $request->filled('date')
            ? Carbon::parse($request->date)->toDateString()
            : Carbon::today()->toDateString();

        $chart = BehaviorChart::with(['items', 'logs'])
            ->where('resident_id', $resident->id)
            ->where('chart_date', $date)
            ->first();

        // Ensure chart_date is a string for reliable frontend comparison
        $chartPayload = $chart ? $chart->toArray() : null;
        if ($chartPayload !== null) {
            $chartPayload['chart_date'] = $chart->chart_date instanceof \Carbon\Carbon
                ? $chart->chart_date->toDateString()
                : (string) $chart->chart_date;
        }

        // Also fetch all active behavior definitions to show in the "New Chart" modal
        $definitions = BehaviorDefinition::with('category')
            ->where('is_active', true)
            ->get()
            ->groupBy('behavior_category_id');

        return response()->json([
            'resident' => $resident,
            'chart' => $chartPayload,
            'is_pending' => $chart && $chart->status === 'draft',
            'is_submitted' => $chart && $chart->status === 'submitted',
        ]);
    }

    /**
     * Store or update a behavior chart for a resident.
     */
    public function store(Request $request): JsonResponse
    {
        $isDraft = $request->input('status') === 'draft';

        $rules = [
            'resident_id' => 'required|exists:residents,id',
            'chart_date' => 'required|date',
            'status' => 'required|in:draft,submitted',
            'items' => 'required|array',
            'items.*.behavior_definition_id' => 'required|exists:behavior_definitions,id',
            'items.*.value' => 'required|boolean',
            'logs' => 'nullable|array',
            'logs.*.occurred_at' => 'required|date',
            'logs.*.triggers' => 'nullable|string',
            'logs.*.caregiver_intervention' => 'nullable|string',
            'logs.*.reported_to_provider' => 'required|boolean',
            'logs.*.outcome' => 'nullable|string',
        ];

        $rules['logs.*.behavior_description'] = $isDraft ? 'nullable|string' : 'required|string';
        $request->validate($rules);

        $user = $request->user();
        $chartDate = Carbon::parse($request->chart_date)->toDateString();

        if ($request->status === 'submitted') {
            $now = Carbon::now();
            $hour = $now->hour;

            if ($hour < 19 || $hour > 21) {
                return response()->json([
                    'message' => 'Charts can only be submitted between 7:00 PM and 9:59 PM.',
                    'errors' => ['time' => ['Charts can only be submitted between 7:00 PM and 9:59 PM.']],
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
                        'behavior_description' => $log['behavior_description'] ?? '',
                        'triggers' => $log['triggers'] ?? null,
                        'caregiver_intervention' => $log['caregiver_intervention'] ?? null,
                        'reported_to_provider' => (bool) ($log['reported_to_provider'] ?? false),
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
     * Get a specific chart by ID with full details.
     */
    public function showChart($id): JsonResponse
    {
        $chart = BehaviorChart::with([
            'resident.branch',
            'caregiver',
            'items.definition.category',
            'logs',
        ])->findOrFail($id);

        return response()->json($chart);
    }

    /**
     * Get pending (draft) charts for a resident for the caregiver portal.
     */
    public function pending(Resident $resident): JsonResponse
    {
        $charts = BehaviorChart::with(['items', 'logs'])
            ->where('resident_id', $resident->id)
            ->where('status', 'draft')
            ->orderBy('chart_date', 'desc')
            ->get()
            ->map(fn ($chart) => [
                'id' => $chart->id,
                'chart_date' => $chart->chart_date instanceof \Carbon\Carbon
                    ? $chart->chart_date->toDateString()
                    : (string) $chart->chart_date,
            ]);

        return response()->json(['data' => $charts]);
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

    /**
     * Update chart status (for review/approval).
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:approved,declined,pending',
        ]);

        $chart = BehaviorChart::findOrFail($id);
        $chart->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'message' => 'Chart status updated successfully.',
            'chart' => $chart->load(['resident', 'caregiver', 'items', 'logs']),
        ]);
    }
}
