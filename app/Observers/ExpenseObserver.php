<?php

namespace App\Observers;

use App\Models\Expense;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class ExpenseObserver
{
    /**
     * Handle the Expense "created" event.
     */
    public function created(Expense $expense): void
    {
        // Load relationships
        $expense->load(['category', 'branch', 'facility', 'createdBy']);

        // Get all administrators and managers for the facility
        $admins = User::where('facility_id', $expense->facility_id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also include the user who created the expense if they're not already in the list
        if ($expense->createdBy && !$admins->contains('id', $expense->createdBy->id)) {
            $admins->push($expense->createdBy);
        }

        $amount = number_format($expense->amount, 2);
        $categoryName = $expense->category?->name ?? 'Unknown Category';
        $branchName = $expense->branch?->name ?? '';
        $location = $branchName ? " ({$branchName})" : '';
        $expenseDate = $expense->expense_date ? Carbon::parse($expense->expense_date)->format('M d, Y') : 'TBD';

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expense_created',
                'title' => 'New Expense Created',
                'message' => "New expense of \${$amount} for '{$expense->description}' ({$categoryName}){$location} was created on {$expenseDate}.",
                'icon' => 'dollar-sign',
                'icon_color' => 'text-green-600',
                'action_url' => '/billing/expenses',
                'metadata' => [
                    'expense_id' => $expense->id,
                    'amount' => $expense->amount,
                    'category' => $categoryName,
                    'branch_id' => $expense->branch_id,
                ],
            ]);
        }
    }

    /**
     * Handle the Expense "updated" event.
     */
    public function updated(Expense $expense): void
    {
        // Check if payment status changed to 'paid' (and wasn't already paid)
        if ($expense->wasChanged('payment_status') 
            && $expense->payment_status === 'paid' 
            && $expense->getOriginal('payment_status') !== 'paid') {
            // Load relationships
            $expense->load(['category', 'branch', 'facility', 'createdBy']);

            // Get all administrators and managers for the facility
            $admins = User::where('facility_id', $expense->facility_id)
                ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();

            // Also include the user who created the expense if they're not already in the list
            if ($expense->createdBy && !$admins->contains('id', $expense->createdBy->id)) {
                $admins->push($expense->createdBy);
            }

            $amount = number_format($expense->amount, 2);
            $categoryName = $expense->category?->name ?? 'Unknown Category';
            $branchName = $expense->branch?->name ?? '';
            $location = $branchName ? " ({$branchName})" : '';

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'expense_paid',
                    'title' => 'Expense Marked as Paid',
                    'message' => "Expense of \${$amount} for '{$expense->description}' ({$categoryName}){$location} has been marked as paid.",
                    'icon' => 'check-circle',
                    'icon_color' => 'text-green-600',
                    'action_url' => '/billing/expenses',
                    'metadata' => [
                        'expense_id' => $expense->id,
                        'amount' => $expense->amount,
                        'category' => $categoryName,
                        'branch_id' => $expense->branch_id,
                    ],
                ]);
            }
        }
    }

    /**
     * Handle the Expense "deleted" event.
     */
    public function deleted(Expense $expense): void
    {
        // Load relationships before deletion
        $expense->load(['category', 'branch', 'facility']);

        // Get all administrators and managers for the facility
        $admins = User::where('facility_id', $expense->facility_id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the deleter if they're not already in the list
        $deleter = auth()->user();
        if ($deleter && !$admins->contains('id', $deleter->id)) {
            $admins->push($deleter);
        }

        $amount = number_format($expense->amount, 2);
        $categoryName = $expense->category?->name ?? 'Unknown Category';
        $branchName = $expense->branch?->name ?? '';
        $location = $branchName ? " ({$branchName})" : '';

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expense_deleted',
                'title' => 'Expense Deleted',
                'message' => "Expense of \${$amount} for '{$expense->description}' ({$categoryName}){$location} has been deleted.",
                'icon' => 'trash-2',
                'icon_color' => 'text-red-600',
                'action_url' => '/billing/expenses',
                'metadata' => [
                    'expense_id' => $expense->id,
                    'amount' => $expense->amount,
                    'category' => $categoryName,
                ],
            ]);
        }
    }
}

