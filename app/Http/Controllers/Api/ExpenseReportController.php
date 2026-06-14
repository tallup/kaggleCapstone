<?php

namespace App\Http\Controllers\Api;

use App\Models\Expense;
use App\Models\BillingInvoice;
use App\Constants\Modules;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ExpenseReportController extends BaseApiController
{
    public function summary(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::BILLING_EXPENSES)) {
            return $error;
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        // Single aggregate query for expenses instead of loading all rows
        $expenseQuery = Expense::whereBetween('expense_date', [$startDate, $endDate]);
        $this->applyBranchFilter($expenseQuery, $request);
        $expenseAgg = (clone $expenseQuery)->selectRaw("
            count(*) as total_count,
            coalesce(sum(amount), 0) as total_amount,
            sum(case when payment_status = 'paid' then amount else 0 end) as paid_amount,
            sum(case when payment_status = 'pending' then amount else 0 end) as pending_amount,
            sum(case when payment_status = 'overdue' then amount else 0 end) as overdue_amount,
            sum(case when payment_status = 'paid' then 1 else 0 end) as paid_count,
            sum(case when payment_status = 'pending' then 1 else 0 end) as pending_count,
            sum(case when payment_status = 'overdue' then 1 else 0 end) as overdue_count
        ")->first();

        // Single aggregate query for invoices
        $invoiceQuery = BillingInvoice::whereBetween('invoice_date', [$startDate, $endDate]);
        $this->applyBranchFilter($invoiceQuery, $request);
        $invoiceAgg = (clone $invoiceQuery)->selectRaw("
            count(*) as total_count,
            coalesce(sum(total_amount), 0) as total_amount,
            sum(case when status = 'paid' then total_amount else 0 end) as paid_amount,
            sum(case when status in ('draft', 'sent') then total_amount else 0 end) as pending_amount,
            sum(case when status = 'overdue' then total_amount else 0 end) as overdue_amount
        ")->first();

        $summary = [
            'total_expenses' => (float) $expenseAgg->total_amount,
            'total_paid' => (float) $expenseAgg->paid_amount,
            'total_pending' => (float) $expenseAgg->pending_amount,
            'total_overdue' => (float) $expenseAgg->overdue_amount,
            'expense_count' => (int) $expenseAgg->total_count,
            'paid_count' => (int) $expenseAgg->paid_count,
            'pending_count' => (int) $expenseAgg->pending_count,
            'overdue_count' => (int) $expenseAgg->overdue_count,
            'total_invoices' => (float) $invoiceAgg->total_amount,
            'invoice_paid' => (float) $invoiceAgg->paid_amount,
            'invoice_pending' => (float) $invoiceAgg->pending_amount,
            'invoice_overdue' => (float) $invoiceAgg->overdue_amount,
            'invoice_count' => (int) $invoiceAgg->total_count,
        ];

        return $this->success($summary);
    }

    public function byCategory(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::BILLING_EXPENSES)) {
            return $error;
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        // Get expenses by category
        // Use withoutGlobalScopes to avoid facility scope conflicts
        $expenseQuery = Expense::withoutGlobalScopes()
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->with('category');
        $this->applyBranchFilter($expenseQuery, $request);
        $expenses = $expenseQuery->get();

        // Get invoices and their items (which have expense categories)
        // Use withoutGlobalScopes to avoid facility scope conflicts
        $invoiceQuery = BillingInvoice::withoutGlobalScopes()
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->with(['items.category']);
        $this->applyBranchFilter($invoiceQuery, $request);
        $invoices = $invoiceQuery->get();

        // Group expenses by category
        $expensesByCategory = $expenses->groupBy('expense_category_id')
            ->map(function ($expenses) {
                $firstExpense = $expenses->first();
                $category = $firstExpense->category;
                
                if (!$category) {
                    return [
                        'category_id' => null,
                        'category_name' => 'Uncategorized',
                        'category_type' => null,
                        'total_amount' => $expenses->sum('amount'),
                        'count' => $expenses->count(),
                    ];
                }
                
                return [
                    'category_id' => $category->id,
                    'category_name' => $category->name ?? 'Uncategorized',
                    'category_type' => $category->type ?? null,
                    'total_amount' => $expenses->sum('amount'),
                    'count' => $expenses->count(),
                ];
            });

        // Group invoice items by category
        $invoiceItemsByCategory = collect();
        foreach ($invoices as $invoice) {
            if (!$invoice->items || $invoice->items->isEmpty()) {
                continue;
            }
            
            foreach ($invoice->items as $item) {
                try {
                    $categoryId = $item->expense_category_id;
                    $key = $categoryId === null ? 'null' : (string)$categoryId;
                    
                    // Safely access category
                    $category = null;
                    if ($item->relationLoaded('category')) {
                        $category = $item->category;
                    } elseif ($categoryId) {
                        $category = \App\Models\ExpenseCategory::find($categoryId);
                    }
                    
                    if (!$invoiceItemsByCategory->has($key)) {
                        $invoiceItemsByCategory[$key] = [
                            'category_id' => $categoryId,
                            'category_name' => $category ? ($category->name ?? 'Uncategorized') : 'Uncategorized',
                            'category_type' => $category ? ($category->type ?? null) : null,
                            'total_amount' => 0,
                            'count' => 0,
                        ];
                    }
                    $invoiceItemsByCategory[$key]['total_amount'] += $item->total ?? 0;
                    $invoiceItemsByCategory[$key]['count'] += 1;
                } catch (\Exception $e) {
                    // Log error but continue processing other items
                    \Log::warning('Error processing invoice item in expense report', [
                        'item_id' => $item->id ?? null,
                        'invoice_id' => $invoice->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }
        }

        // Convert both collections to use consistent keys
        $expensesKeyed = $expensesByCategory->mapWithKeys(function ($item, $categoryId) {
            $key = $categoryId === null ? 'null' : (string)$categoryId;
            return [$key => $item];
        });

        // Merge and aggregate
        $allCategories = $expensesKeyed->merge($invoiceItemsByCategory);
        
        $byCategory = $allCategories->groupBy(function ($item) {
            return $item['category_id'] ?? 'null';
        })
            ->map(function ($items) {
                $first = $items->first();
                return [
                    'category_id' => $first['category_id'],
                    'category_name' => $first['category_name'],
                    'category_type' => $first['category_type'],
                    'total_amount' => $items->sum('total_amount'),
                    'count' => $items->sum('count'),
                ];
            })
            ->values()
            ->filter(function ($item) {
                // Only include categories that have expenses (amount > 0 and count > 0)
                // AND exclude uncategorized entries (category_id is null)
                return ($item['total_amount'] > 0 || $item['count'] > 0) 
                    && $item['category_id'] !== null;
            })
            ->sortByDesc('total_amount')
            ->values();

        return $this->success($byCategory);
    }

    public function byDateRange(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::BILLING_EXPENSES)) {
            return $error;
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());
        $groupBy = $request->get('group_by', 'day'); // day, week, month

        $query = Expense::whereBetween('expense_date', [$startDate, $endDate]);
        $this->applyBranchFilter($query, $request);

        $expenses = $query->get();

        $grouped = $expenses->groupBy(function ($expense) use ($groupBy) {
            $date = \Carbon\Carbon::parse($expense->expense_date);
            switch ($groupBy) {
                case 'week':
                    return $date->format('Y-W');
                case 'month':
                    return $date->format('Y-m');
                default:
                    return $date->format('Y-m-d');
            }
        })->map(function ($expenses, $key) {
            return [
                'date' => $key,
                'total_amount' => $expenses->sum('amount'),
                'count' => $expenses->count(),
            ];
        })->values();

        return $this->success($grouped);
    }

    public function residentBilling(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::BILLING_EXPENSES)) {
            return $error;
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        // Get expenses linked to residents
        $expenseQuery = Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->whereNotNull('resident_id')
            ->with(['resident', 'category']);
        $this->applyBranchFilter($expenseQuery, $request);

        // Get invoices
        $invoiceQuery = BillingInvoice::whereBetween('invoice_date', [$startDate, $endDate])
            ->with(['resident', 'items']);
        $this->applyBranchFilter($invoiceQuery, $request);

        $expenses = $expenseQuery->get();
        $invoices = $invoiceQuery->get();

        $byResident = collect()
            ->merge($expenses->groupBy('resident_id'))
            ->merge($invoices->groupBy('resident_id'))
            ->map(function ($items, $residentId) use ($expenses, $invoices) {
                $resident = $items->first()->resident ?? $invoices->where('resident_id', $residentId)->first()?->resident;
                $residentExpenses = $expenses->where('resident_id', $residentId);
                $residentInvoices = $invoices->where('resident_id', $residentId);

                return [
                    'resident_id' => $residentId,
                    'resident_name' => $resident ? $resident->name : 'Unknown',
                    'total_expenses' => $residentExpenses->sum('amount'),
                    'total_invoices' => $residentInvoices->sum('total_amount'),
                    'total_billing' => $residentExpenses->sum('amount') + $residentInvoices->sum('total_amount'),
                    'expense_count' => $residentExpenses->count(),
                    'invoice_count' => $residentInvoices->count(),
                ];
            })
            ->values();

        return $this->success($byResident);
    }

    public function vendorPayments(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::BILLING_EXPENSES)) {
            return $error;
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $query = Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->whereNotNull('vendor_name');
        $this->applyBranchFilter($query, $request);

        $byVendor = $query->get()
            ->groupBy('vendor_name')
            ->map(function ($expenses) {
                return [
                    'vendor_name' => $expenses->first()->vendor_name,
                    'total_amount' => $expenses->sum('amount'),
                    'count' => $expenses->count(),
                    'paid_amount' => $expenses->where('payment_status', 'paid')->sum('amount'),
                    'pending_amount' => $expenses->where('payment_status', 'pending')->sum('amount'),
                ];
            })
            ->values()
            ->sortByDesc('total_amount')
            ->values();

        return $this->success($byVendor);
    }
}

