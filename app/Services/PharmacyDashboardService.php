<?php

namespace App\Services;

use App\Models\PharmacyInventory;
use App\Models\PharmacyOrder;
use App\Models\PharmacySupplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PharmacyDashboardService
{
    /**
     * Get comprehensive pharmacy dashboard stats
     */
    public function getStats(User $user): array
    {
        $facilityId = $this->getFacilityId($user);
        $branchId = $this->getBranchId($user);
        
        try {
            // Inventory Stats
            $inventoryQuery = PharmacyInventory::withoutGlobalScopes()
                ->with(['drug', 'branch']);
            
            if ($facilityId) {
                $inventoryQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $inventoryQuery->where('branch_id', $branchId);
            }
            
            // Aggregate inventory stats in DB instead of loading all rows
            $inventoryStats = (clone $inventoryQuery)->selectRaw("
                count(*) as total_items,
                coalesce(sum(coalesce(quantity, 0) * coalesce(unit_cost, 0)), 0) as total_value,
                sum(case when quantity > 0 and quantity <= coalesce(minimum_stock_level, 0) then 1 else 0 end) as low_stock,
                sum(case when coalesce(quantity, 0) <= 0 then 1 else 0 end) as out_of_stock
            ")->first();

            $totalItems = (int) $inventoryStats->total_items;
            $totalInventoryValue = (float) $inventoryStats->total_value;
            $lowStockItems = (int) $inventoryStats->low_stock;
            $outOfStockItems = (int) $inventoryStats->out_of_stock;
            $inStockItems = $totalItems - $outOfStockItems;

            // Load collection only for list views (low stock, out of stock, branch grouping)
            $inventory = $inventoryQuery->get();
            
            // Order Stats
            $orderQuery = PharmacyOrder::withoutGlobalScopes()
                ->with(['supplier', 'branch']);
            
            if ($facilityId) {
                $orderQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $orderQuery->where('branch_id', $branchId);
            }
            
            // Aggregate order stats in DB
            $orderStats = (clone $orderQuery)->selectRaw("
                count(*) as total_orders,
                coalesce(sum(total), 0) as total_value,
                sum(case when status = 'pending' then 1 else 0 end) as pending_count,
                sum(case when status = 'received' then 1 else 0 end) as received_count,
                sum(case when status = 'pending' then coalesce(total, 0) else 0 end) as pending_value
            ")->first();

            $totalOrders = (int) $orderStats->total_orders;
            $totalOrderValue = (float) $orderStats->total_value;
            $pendingOrders = (int) $orderStats->pending_count;
            $receivedOrders = (int) $orderStats->received_count;
            $pendingOrderValue = (float) $orderStats->pending_value;
            
            // Supplier Stats - Filter by facility
            $supplierQuery = PharmacySupplier::query()->where('is_active', true);
            
            if ($facilityId) {
                // Filter suppliers by those created by users in the facility OR
                // suppliers that have orders for branches in the facility
                $supplierQuery->where(function ($q) use ($facilityId) {
                    $q->whereHas('createdBy', function ($q) use ($facilityId) {
                        $q->where('facility_id', $facilityId);
                    })->orWhereHas('orders.branch', function ($q) use ($facilityId) {
                        $q->where('facility_id', $facilityId);
                    });
                });
            }
            
            $totalSuppliers = $supplierQuery->count();
            
            // Recent Orders (last 10)
            $recentOrders = $orderQuery->orderBy('order_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'supplier_name' => $order->supplier?->name ?? 'Unknown',
                        'branch_name' => $order->branch?->name ?? 'Unknown',
                        'status' => $order->status,
                        'order_date' => $order->order_date?->format('Y-m-d'),
                        'expected_delivery_date' => $order->expected_delivery_date?->format('Y-m-d'),
                        'total' => $order->total,
                    ];
                });
            
            // Low Stock Items (top 10)
            $lowStockItemsList = $inventory->filter(function ($item) {
                return $item->quantity > 0 && $item->quantity <= ($item->minimum_stock_level ?? 0);
            })
            ->sortBy('quantity')
            ->take(10)
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'drug_name' => $item->drug?->name ?? 'Unknown',
                    'branch_name' => $item->branch?->name ?? 'Unknown',
                    'quantity' => $item->quantity,
                    'minimum_stock_level' => $item->minimum_stock_level,
                    'unit_cost' => $item->unit_cost,
                    'location' => $item->location,
                ];
            })
            ->values();
            
            // Out of Stock Items
            $outOfStockItemsList = $inventory->filter(function ($item) {
                return ($item->quantity ?? 0) <= 0;
            })
            ->take(10)
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'drug_name' => $item->drug?->name ?? 'Unknown',
                    'branch_name' => $item->branch?->name ?? 'Unknown',
                    'quantity' => $item->quantity,
                    'minimum_stock_level' => $item->minimum_stock_level,
                    'unit_cost' => $item->unit_cost,
                    'location' => $item->location,
                ];
            })
            ->values();
            
            // Orders by Status (last 30 days) — DB GROUP BY instead of loading all rows
            $ordersLast30Days = (clone $orderQuery)
                ->where('order_date', '>=', now()->subDays(30))
                ->selectRaw('status, count(*) as count, coalesce(sum(total), 0) as total_value')
                ->groupBy('status')
                ->get()
                ->keyBy('status')
                ->map(fn ($row) => [
                    'count' => (int) $row->count,
                    'total_value' => (float) $row->total_value,
                ]);
            
            // Inventory by Branch
            $inventoryByBranch = $inventory->groupBy('branch_id')
                ->map(function ($items, $branchId) {
                    $branch = $items->first()->branch;
                    return [
                        'branch_id' => $branchId,
                        'branch_name' => $branch?->name ?? 'Unknown',
                        'item_count' => $items->count(),
                        'total_value' => $items->sum(function ($item) {
                            return ($item->quantity ?? 0) * ($item->unit_cost ?? 0);
                        }),
                        'low_stock_count' => $items->filter(function ($item) {
                            return $item->quantity > 0 && $item->quantity <= ($item->minimum_stock_level ?? 0);
                        })->count(),
                        'out_of_stock_count' => $items->filter(function ($item) {
                            return ($item->quantity ?? 0) <= 0;
                        })->count(),
                    ];
                })
                ->values();
            
            return [
                'inventory' => [
                    'total_value' => round($totalInventoryValue, 2),
                    'total_items' => $totalItems,
                    'in_stock_items' => $inStockItems,
                    'low_stock_count' => $lowStockItems,
                    'out_of_stock_count' => $outOfStockItems,
                    'low_stock_items' => $lowStockItemsList,
                    'out_of_stock_items' => $outOfStockItemsList,
                ],
                'orders' => [
                    'total' => $totalOrders,
                    'pending' => $pendingOrders,
                    'received' => $receivedOrders,
                    'total_value' => round($totalOrderValue, 2),
                    'pending_value' => round($pendingOrderValue, 2),
                    'recent_orders' => $recentOrders,
                    'by_status_last_30_days' => $ordersLast30Days,
                ],
                'suppliers' => [
                    'total_active' => $totalSuppliers,
                ],
                'inventory_by_branch' => $inventoryByBranch,
            ];
            
        } catch (\Exception $e) {
            Log::error('PharmacyDashboardService: Error fetching stats', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return empty stats on error
            return [
                'inventory' => [
                    'total_value' => 0,
                    'total_items' => 0,
                    'in_stock_items' => 0,
                    'low_stock_count' => 0,
                    'out_of_stock_count' => 0,
                    'low_stock_items' => [],
                    'out_of_stock_items' => [],
                ],
                'orders' => [
                    'total' => 0,
                    'pending' => 0,
                    'received' => 0,
                    'total_value' => 0,
                    'pending_value' => 0,
                    'recent_orders' => [],
                    'by_status_last_30_days' => [],
                ],
                'suppliers' => [
                    'total_active' => 0,
                ],
                'inventory_by_branch' => [],
            ];
        }
    }
    
    /**
     * Get facility ID for user
     */
    private function getFacilityId(User $user): ?int
    {
        if ($user->facility_id) {
            return $user->facility_id;
        }
        
        if ($user->assigned_branch_id) {
            $branch = \App\Models\Branch::find($user->assigned_branch_id);
            if ($branch && $branch->facility_id) {
                return $branch->facility_id;
            }
        }
        
        try {
            $facility = app()->bound('facility') ? app('facility') : null;
            if ($facility) {
                return $facility->id;
            }
        } catch (\Exception $e) {
            // Ignore
        }
        
        return null;
    }
    
    /**
     * Get branch ID for user (if caregiver)
     */
    private function getBranchId(User $user): ?int
    {
        if (\App\Constants\UserRoles::isCaregiverRole($user->role)) {
            return $user->assigned_branch_id;
        }
        
        return null;
    }
}

