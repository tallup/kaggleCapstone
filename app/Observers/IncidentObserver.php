<?php

namespace App\Observers;

use App\Models\Incident;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use App\Events\IncidentCreated;
use Carbon\Carbon;

class IncidentObserver
{
    /**
     * Handle the Incident "created" event.
     */
    public function created(Incident $incident): void
    {
        try {
            // Load relationships
            $incident->load(['resident', 'reportedBy', 'assignedTo']);

            // Always notify all admins/managers for incidents (critical events)
            $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();

            $residentName = $incident->resident 
                ? trim(($incident->resident->first_name ?? '') . ' ' . ($incident->resident->last_name ?? ''))
                : 'Unknown Resident';
            
            $reportedByName = $incident->reportedBy 
                ? trim(($incident->reportedBy->first_name ?? '') . ' ' . ($incident->reportedBy->last_name ?? ''))
                : 'Staff';
            
            $incidentDate = $incident->incident_date ? Carbon::parse($incident->incident_date)->format('M d, Y g:i A') : 'TBD';
            $incidentNumber = $incident->incident_number ?? 'N/A';
            $location = $incident->location ? " at {$incident->location}" : '';
            
            // Determine icon color based on severity and priority
            $iconColor = match($incident->priority ?? $incident->severity ?? 'low') {
                'critical' => 'text-red-600',
                'high' => 'text-orange-600',
                'medium' => 'text-yellow-600',
                default => 'text-[#8B4513]',
            };
            
            foreach ($admins as $admin) {
                try {
                    Notification::create([
                        'user_id' => $admin->id,
                        'type' => 'incident_reported',
                        'title' => 'New Incident Reported',
                        'message' => "Incident #{$incidentNumber}: A {$incident->severity} severity, {$incident->priority} priority {$incident->incident_type} incident involving {$residentName}{$location} was reported by {$reportedByName} on {$incidentDate}",
                        'icon' => 'alert-circle',
                        'icon_color' => $iconColor,
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'incident_type' => $incident->incident_type,
                            'severity' => $incident->severity,
                            'priority' => $incident->priority,
                            'status' => $incident->status,
                            'location' => $incident->location,
                        ],
                    ]);
                } catch (\Exception $ne) {
                    \Log::error("Failed to create admin notification for incident {$incident->id}: " . $ne->getMessage());
                }
            }

            // Notify assigned staff if incident is assigned
            if ($incident->assigned_to && $incident->assignedTo) {
                try {
                    Notification::create([
                        'user_id' => $incident->assigned_to,
                        'type' => 'incident_assigned',
                        'title' => 'Incident Assigned to You',
                        'message' => "You have been assigned to handle Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName}{$location}",
                        'icon' => 'user-check',
                        'icon_color' => $iconColor,
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'incident_type' => $incident->incident_type,
                            'severity' => $incident->severity,
                            'priority' => $incident->priority,
                            'status' => $incident->status,
                        ],
                    ]);
                } catch (\Exception $ne) {
                    \Log::error("Failed to create staff notification for incident {$incident->id}: " . $ne->getMessage());
                }
            }

            // Send email notifications
            try {
                $notificationService = app(\App\Services\NotificationService::class);
                $notificationService->sendIncidentEmail($incident, $admins, 'reported');
            } catch (\Exception $ee) {
                \Log::error("Failed to send incident emails for incident {$incident->id}: " . $ee->getMessage());
            }

            // Broadcast real-time event
            event(new IncidentCreated($incident));
        } catch (\Exception $e) {
            \Log::error("Error in IncidentObserver::created for incident {$incident->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Handle the Incident "updated" event.
     */
    public function updated(Incident $incident): void
    {
        // Load relationships
        $incident->load(['resident', 'reportedBy', 'assignedTo', 'resolvedBy']);

        $changes = $incident->getChanges();
        $original = $incident->getOriginal();
        
        $residentName = trim(($incident->resident->first_name ?? '') . ' ' . ($incident->resident->last_name ?? ''));
        $incidentNumber = $incident->incident_number ?? 'N/A';

        // Handle status changes
        if (isset($changes['status'])) {
            $oldStatus = $original['status'] ?? 'open';
            $newStatus = $changes['status'];

            // Notify relevant users when status changes to resolved
            if ($newStatus === Incident::STATUS_RESOLVED) {
                $notifyUsers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                    ->where('is_active', true)
                    ->get();

                if ($incident->resolved_by && $incident->resolvedBy) {
                    $notifyUsers->push($incident->resolvedBy);
                }

                foreach ($notifyUsers as $user) {
                    Notification::create([
                        'user_id' => $user->id,
                        'type' => 'incident_resolved',
                        'title' => 'Incident Resolved',
                        'message' => "Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName} has been resolved",
                        'icon' => 'check-circle',
                        'icon_color' => 'text-green-600',
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'status' => $newStatus,
                        ],
                    ]);
                }
            }

            // Notify when status changes to closed
            if ($newStatus === Incident::STATUS_CLOSED) {
                $notifyUsers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                    ->where('is_active', true)
                    ->get();

                if ($incident->reported_by && $incident->reportedBy) {
                    $notifyUsers->push($incident->reportedBy);
                }

                foreach ($notifyUsers as $user) {
                    Notification::create([
                        'user_id' => $user->id,
                        'type' => 'incident_closed',
                        'title' => 'Incident Closed',
                        'message' => "Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName} has been closed",
                        'icon' => 'lock-closed',
                        'icon_color' => 'text-gray-600',
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'status' => $newStatus,
                        ],
                    ]);
                }

                // Send email notifications
                $notificationService = app(NotificationService::class);
                $notificationService->sendIncidentEmail($incident, $notifyUsers, 'resolved');
            }

            // Notify when status changes to closed
            if ($newStatus === Incident::STATUS_CLOSED) {
                $notifyUsers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                    ->where('is_active', true)
                    ->get();

                if ($incident->reported_by && $incident->reportedBy) {
                    $notifyUsers->push($incident->reportedBy);
                }

                foreach ($notifyUsers as $user) {
                    Notification::create([
                        'user_id' => $user->id,
                        'type' => 'incident_closed',
                        'title' => 'Incident Closed',
                        'message' => "Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName} has been closed",
                        'icon' => 'lock-closed',
                        'icon_color' => 'text-gray-600',
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'status' => $newStatus,
                        ],
                    ]);
                }

                // Send email notifications
                $notificationService = app(NotificationService::class);
                $notificationService->sendIncidentEmail($incident, $notifyUsers, 'closed');
            }
        }

        // Handle assignment changes
        if (isset($changes['assigned_to'])) {
            $oldAssigned = $original['assigned_to'] ?? null;
            $newAssigned = $changes['assigned_to'];

            // Notify newly assigned user
            if ($newAssigned && $incident->assignedTo) {
                Notification::create([
                    'user_id' => $newAssigned,
                    'type' => 'incident_assigned',
                    'title' => 'Incident Assigned to You',
                    'message' => "You have been assigned to handle Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName}",
                    'icon' => 'user-check',
                    'icon_color' => 'text-blue-600',
                    'action_url' => '/incidents/' . $incident->id,
                    'metadata' => [
                        'incident_id' => $incident->id,
                        'incident_number' => $incidentNumber,
                        'resident_id' => $incident->resident_id,
                        'incident_type' => $incident->incident_type,
                        'severity' => $incident->severity,
                        'priority' => $incident->priority,
                        'status' => $incident->status,
                    ],
                ]);
            }

            // Send email notifications
            $notificationService = app(NotificationService::class);
            $notificationService->sendIncidentEmail($incident, collect([$incident->assignedTo]), 'assigned');
        }

        // Handle priority or severity escalation
        if (isset($changes['priority']) || isset($changes['severity'])) {
            $currentPriority = $changes['priority'] ?? $incident->priority;
            $currentSeverity = $changes['severity'] ?? $incident->severity;

            if ($currentPriority === Incident::PRIORITY_CRITICAL || $currentSeverity === Incident::SEVERITY_CRITICAL) {
                $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                    ->where('is_active', true)
                    ->get();

                foreach ($admins as $admin) {
                    Notification::create([
                        'user_id' => $admin->id,
                        'type' => 'incident_escalated',
                        'title' => 'Critical Incident Escalation',
                        'message' => "Incident #{$incidentNumber}: {$incident->incident_type} involving {$residentName} has been escalated to CRITICAL priority/severity",
                        'icon' => 'exclamation-triangle',
                        'icon_color' => 'text-red-600',
                        'action_url' => '/incidents/' . $incident->id,
                        'metadata' => [
                            'incident_id' => $incident->id,
                            'incident_number' => $incidentNumber,
                            'resident_id' => $incident->resident_id,
                            'priority' => $currentPriority,
                            'severity' => $currentSeverity,
                        ],
                    ]);
                }

                // Send email notifications
                $notificationService = app(NotificationService::class);
                $notificationService->sendIncidentEmail($incident, $admins, 'escalated');
            }
        }
    }
}


