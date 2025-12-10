<?php

namespace App\Observers;

use App\Models\ExpenseCategory;
use App\Models\Notification;
use App\Models\User;

class ExpenseCategoryObserver
{
    /**
     * Handle the ExpenseCategory "created" event.
     */
    public function created(ExpenseCategory $category): void
    {
        $category->load('facility');
        
        // Get all administrators and managers for the facility
        $admins = User::where('facility_id', $category->facility_id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the creator if they're not already in the list
        $creator = auth()->user();
        if ($creator && !$admins->contains('id', $creator->id)) {
            $admins->push($creator);
        }

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expense_category_created',
                'title' => 'Expense Category Created',
                'message' => "New expense category '{$category->name}' ({$category->type}) has been created.",
                'icon' => 'folder-plus',
                'icon_color' => 'text-blue-600',
                'action_url' => '/billing/expense-categories',
                'metadata' => [
                    'expense_category_id' => $category->id,
                    'category_name' => $category->name,
                    'category_type' => $category->type,
                ],
            ]);
        }
    }

    /**
     * Handle the ExpenseCategory "updated" event.
     */
    public function updated(ExpenseCategory $category): void
    {
        $category->load('facility');
        
        // Get all administrators and managers for the facility
        $admins = User::where('facility_id', $category->facility_id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the updater if they're not already in the list
        $updater = auth()->user();
        if ($updater && !$admins->contains('id', $updater->id)) {
            $admins->push($updater);
        }

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expense_category_updated',
                'title' => 'Expense Category Updated',
                'message' => "Expense category '{$category->name}' has been updated.",
                'icon' => 'edit',
                'icon_color' => 'text-yellow-600',
                'action_url' => '/billing/expense-categories',
                'metadata' => [
                    'expense_category_id' => $category->id,
                    'category_name' => $category->name,
                ],
            ]);
        }
    }

    /**
     * Handle the ExpenseCategory "deleted" event.
     */
    public function deleted(ExpenseCategory $category): void
    {
        // Get all administrators and managers for the facility
        $admins = User::where('facility_id', $category->facility_id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the deleter if they're not already in the list
        $deleter = auth()->user();
        if ($deleter && !$admins->contains('id', $deleter->id)) {
            $admins->push($deleter);
        }

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'expense_category_deleted',
                'title' => 'Expense Category Deleted',
                'message' => "Expense category '{$category->name}' has been deleted.",
                'icon' => 'trash-2',
                'icon_color' => 'text-red-600',
                'action_url' => '/billing/expense-categories',
                'metadata' => [
                    'expense_category_id' => $category->id,
                    'category_name' => $category->name,
                ],
            ]);
        }
    }
}


