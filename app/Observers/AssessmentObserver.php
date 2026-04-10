<?php

namespace App\Observers;

use App\Models\Assessment;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class AssessmentObserver
{
    /**
     * Handle the Assessment "created" event.
     */
    public function created(Assessment $assessment): void
    {
        // Load relationships
        $assessment->load(['resident', 'assessor']);

        // Get all admins/managers
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $residentName = trim(($assessment->resident->first_name ?? '') . ' ' . ($assessment->resident->last_name ?? ''));
            $assessorName = trim(($assessment->assessor->first_name ?? '') . ' ' . ($assessment->assessor->last_name ?? ''));
            
            // Format assessment date
            $assessmentDate = $assessment->assessment_date 
                ? Carbon::parse($assessment->assessment_date)->format('M d, Y') 
                : 'TBD';
            
            Notification::create([
                'user_id' => $admin->id,
                'facility_id' => $assessment->resident?->branch?->facility_id ?? null,
                'branch_id' => $assessment->branch_id ?? $assessment->resident?->branch_id ?? null,
                'type' => 'assessment_created',
                'title' => 'New Assessment Created',
                'message' => "A new {$assessment->assessment_type} assessment has been created for {$residentName}" . 
                           ($assessorName ? " by {$assessorName}" : '') . 
                           " on {$assessmentDate}",
                'icon' => 'clipboard',
                'icon_color' => 'text-[#8B4513]',
                'action_url' => "/assessments/{$assessment->id}/review",
                'metadata' => [
                    'assessment_id' => $assessment->id,
                    'resident_id' => $assessment->resident_id,
                    'assessment_type' => $assessment->assessment_type,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendAssessmentEmail($assessment, $admins, 'created');
    }

    /**
     * Handle the Assessment "updated" event.
     */
    public function updated(Assessment $assessment): void
    {
        // Get original status before update
        $originalStatus = $assessment->getOriginal('status');
        $currentStatus = $assessment->status;
        
        // Check if status changed to 'completed' or 'approved'
        $statusChangedToCompleted = $assessment->wasChanged('status') && 
                                    $originalStatus !== 'completed' && 
                                    $originalStatus !== 'approved' &&
                                    in_array($currentStatus, ['completed', 'approved']);
        
        // Also check if completed_at was just set (even if status didn't change)
        $completedAtChanged = $assessment->wasChanged('completed_at') && 
                              $assessment->completed_at !== null &&
                              $currentStatus === 'completed';
        
        // Also check if approved_at was just set (even if status didn't change)
        $approvedAtChanged = $assessment->wasChanged('approved_at') && 
                            $assessment->approved_at !== null &&
                            $currentStatus === 'approved';

        if ($statusChangedToCompleted || $completedAtChanged || $approvedAtChanged) {
            // Load relationships
            $assessment->load(['resident', 'assessor']);

            // Get all admins/managers
            $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();

            foreach ($admins as $admin) {
                $residentName = trim(($assessment->resident->first_name ?? '') . ' ' . ($assessment->resident->last_name ?? ''));
                $assessorName = trim(($assessment->assessor->first_name ?? '') . ' ' . ($assessment->assessor->last_name ?? ''));
                
                // Determine completion status
                $statusText = $assessment->status === 'approved' ? 'approved' : 'completed';
                $completionDate = $assessment->status === 'approved' 
                    ? ($assessment->approved_at ? Carbon::parse($assessment->approved_at)->format('M d, Y g:i A') : 'TBD')
                    : ($assessment->completed_at ? Carbon::parse($assessment->completed_at)->format('M d, Y g:i A') : 'TBD');
                
                Notification::create([
                    'user_id' => $admin->id,
                    'facility_id' => $assessment->resident?->branch?->facility_id ?? null,
                    'branch_id' => $assessment->branch_id ?? $assessment->resident?->branch_id ?? null,
                    'type' => 'assessment_completed',
                    'title' => 'Assessment ' . ucfirst($statusText),
                    'message' => "The {$assessment->assessment_type} assessment for {$residentName}" . 
                               ($assessorName ? " by {$assessorName}" : '') . 
                               " has been {$statusText} on {$completionDate}",
                    'icon' => 'clipboard',
                    'icon_color' => 'text-green-600',
                    'action_url' => "/assessments/{$assessment->id}/review",
                    'metadata' => [
                        'assessment_id' => $assessment->id,
                        'resident_id' => $assessment->resident_id,
                        'assessment_type' => $assessment->assessment_type,
                        'status' => $assessment->status,
                    ],
                ]);
            }

            // Send email notifications
            $notificationService = app(NotificationService::class);
            $notificationService->sendAssessmentEmail($assessment, $admins, 'completed');
        }
    }
}

