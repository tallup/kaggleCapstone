<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Notification;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    public function __construct(
        private DashboardService $dashboardService
    ) {
    }

    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Notify all admins/managers when a new user is added
        // Only notify if there are other admins (avoid notifying when creating first admin)
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->where('id', '!=', $user->id) // Don't notify the user themselves
            ->get();

        // Only send notifications if there are other admins to notify
        if ($admins->isEmpty()) {
            return;
        }

        foreach ($admins as $admin) {
            $userName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->name;
            $role = ucfirst($user->role ?? 'User');
            $email = $user->email ?? 'No email';
            
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'user_created',
                'title' => 'New User Added',
                'message' => "A new {$role}, {$userName} ({$email}), has been added to the system",
                'icon' => 'user-plus',
                'icon_color' => 'text-[#25603E]',
                'action_url' => '/administration/users',
                'metadata' => [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'facility_id' => $user->facility_id,
                ],
            ]);
        }
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        // Clear dashboard cache if facility_id or assigned_branch_id changed
        if ($user->wasChanged(['facility_id', 'assigned_branch_id', 'role'])) {
            try {
                $this->dashboardService->clearCacheForUser($user);
                Log::info('UserObserver: Cleared dashboard cache after user update', [
                    'user_id' => $user->id,
                    'changed_fields' => $user->getChanges(),
                ]);
            } catch (\Exception $e) {
                Log::warning('UserObserver: Failed to clear dashboard cache', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}

