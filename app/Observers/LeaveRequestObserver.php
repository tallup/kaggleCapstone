<?php

namespace App\Observers;

use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class LeaveRequestObserver
{
    /**
     * Handle the LeaveRequest "created" event.
     */
    public function created(LeaveRequest $leaveRequest): void
    {
        // Load relationships
        $leaveRequest->load(['staff']);

        // Notify all admins/managers when a leave request is created
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $staffName = trim(($leaveRequest->staff->first_name ?? '') . ' ' . ($leaveRequest->staff->last_name ?? ''));
            $startDate = $leaveRequest->start_date ? Carbon::parse($leaveRequest->start_date)->format('M d, Y') : 'TBD';
            $endDate = $leaveRequest->end_date ? Carbon::parse($leaveRequest->end_date)->format('M d, Y') : 'TBD';
            $duration = $leaveRequest->duration ?? 0;
            
            Notification::create([
                'user_id' => $admin->id,
                'facility_id' => $leaveRequest->facility_id ?? null,
                'branch_id' => $leaveRequest->branch_id ?? $leaveRequest->assigned_branch_id ?? null,
                'type' => 'leave_request',
                'title' => 'New Leave Request',
                'message' => "{$staffName} has submitted a leave request from {$startDate} to {$endDate} ({$duration} days)",
                'icon' => 'user-check',
                'icon_color' => 'text-[#8B4513]',
                'action_url' => '/administration/leave-requests',
                'metadata' => [
                    'leave_request_id' => $leaveRequest->id,
                    'staff_id' => $leaveRequest->staff_id,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendLeaveRequestEmail($leaveRequest, $admins, 'created');
    }

    /**
     * Handle the LeaveRequest "updated" event.
     */
    public function updated(LeaveRequest $leaveRequest): void
    {
        // Check if status changed to approved or declined
        if ($leaveRequest->wasChanged('status')) {
            $originalStatus = $leaveRequest->getOriginal('status');
            $currentStatus = $leaveRequest->status;
            
            // Only notify if status changed to approved or declined
            if (in_array($currentStatus, ['approved', 'declined']) && $originalStatus !== $currentStatus) {
                // Load relationships
                $leaveRequest->load(['staff', 'approvedBy']);
                
                // Notify the staff member who requested the leave
                $staff = $leaveRequest->staff;
                if ($staff) {
                    $approvedByName = $leaveRequest->approvedBy 
                        ? trim(($leaveRequest->approvedBy->first_name ?? '') . ' ' . ($leaveRequest->approvedBy->last_name ?? ''))
                        : 'Administrator';
                    
                    $statusText = $currentStatus === 'approved' ? 'approved' : 'declined';
                    $iconColor = $currentStatus === 'approved' ? 'text-green-600' : 'text-red-600';
                    $title = $currentStatus === 'approved' ? 'Leave Request Approved' : 'Leave Request Declined';
                    
                    Notification::create([
                        'user_id' => $staff->id,
                        'facility_id' => $leaveRequest->facility_id ?? null,
                        'branch_id' => $leaveRequest->branch_id ?? $leaveRequest->assigned_branch_id ?? null,
                        'type' => $currentStatus === 'approved' ? 'leave_approved' : 'leave_rejected',
                        'title' => $title,
                        'message' => "Your leave request has been {$statusText} by {$approvedByName}",
                        'icon' => $currentStatus === 'approved' ? 'check' : 'x',
                        'icon_color' => $iconColor,
                        'action_url' => '/administration/leave-requests',
                        'metadata' => [
                            'leave_request_id' => $leaveRequest->id,
                            'status' => $currentStatus,
                    ],
                ]);
            }

            // Send email notification to staff member
            $notificationService = app(NotificationService::class);
            $notificationService->sendLeaveRequestEmail($leaveRequest, collect([$staff]), $currentStatus === 'approved' ? 'approved' : 'declined');
        }
    }
}
}


