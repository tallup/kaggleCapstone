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
            
            $inventory = $inventoryQuery->get();
            
            $totalInventoryValue = $inventory->sum(function ($item) {
                return ($item->quantity ?? 0) * ($item->unit_cost ?? 0);
            });
            
            $lowStockItems = $inventory->filter(function ($item) {
                return $item->quantity > 0 && $item->quantity <= ($item->minimum_stock_level ?? 0);
            })->count();
            
            $outOfStockItems = $inventory->filter(function ($item) {
                return ($item->quantity ?? 0) <= 0;
            })->count();
            
            $totalItems = $inventory->count();
            $inStockItems = $totalItems - $outOfStockItems;
            
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
            
            $orders = $orderQuery->get();
            
            $pendingOrders = $orders->where('status', 'pending')->count();
            $receivedOrders = $orders->where('status', 'received')->count();
            $totalOrders = $orders->count();
            $totalOrderValue = $orders->sum('total');
            $pendingOrderValue = $orders->where('status', 'pending')->sum('total');
            
            // Supplier Stats
            $supplierQuery = PharmacySupplier::query();
            $totalSuppliers = $supplierQuery->where('is_active', true)->count();
            
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
            
            // Orders by Status (last 30 days)
            $ordersLast30Days = $orderQuery->where('order_date', '>=', now()->subDays(30))
                ->get()
                ->groupBy('status')
                ->map(function ($group) {
                    return [
                        'count' => $group->count(),
                        'total_value' => $group->sum('total'),
                    ];
                });
            
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

