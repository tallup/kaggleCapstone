<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviorCategory;
use App\Models\BehaviorDefinition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BehaviorDataController extends Controller
{
    /**
     * Display a listing of behavior categories and their definitions.
     */
    public function index()
    {
        $categories = BehaviorCategory::with(['definitions' => function ($query) {
            $query->where('is_active', true);
        }])
        ->where('is_active', true)
        ->get();
        
        return response()->json($categories);
    }

    /**
     * Store a newly created behavior definition.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'behavior_category_id' => 'required|exists:behavior_categories,id',
            'name' => 'required|string|max:255',
        ]);

        $definition = BehaviorDefinition::create($validated);

        return response()->json($definition, 201);
    }

    /**
     * Remove the specified behavior definition.
     */
    public function destroy(BehaviorDefinition $behaviorDefinition)
    {
        $behaviorDefinition->delete();
        return response()->json(null, 204);
    }

    /**
     * Bulk update/sync behavior definitions for multiple categories.
     * This handles additions and removals in one go as suggested by the 'Submit' button.
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'data' => 'required|array',
            'data.*.id' => 'nullable|exists:behavior_definitions,id',
            'data.*.behavior_category_id' => 'required|exists:behavior_categories,id',
            'data.*.name' => 'required|string|max:255',
            'data.*.is_remove' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['data'] as $item) {
                if (!empty($item['is_remove']) && !empty($item['id'])) {
                    BehaviorDefinition::where('id', $item['id'])->delete();
                } elseif (empty($item['id'])) {
                    BehaviorDefinition::create([
                        'behavior_category_id' => $item['behavior_category_id'],
                        'name' => $item['name'],
                    ]);
                } else {
                    BehaviorDefinition::where('id', $item['id'])->update([
                        'name' => $item['name'],
                    ]);
                }
            }
            DB::commit();
            return response()->json(['message' => 'Chart data updated successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update chart data', 'error' => $e->getMessage()], 500);
        }
    }
}
