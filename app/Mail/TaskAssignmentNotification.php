<?php

namespace App\Mail;

use App\Models\CleaningTaskAssignment;
use App\Models\Facility;
use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class TaskAssignmentNotification extends Mailable
{
    use Queueable, SerializesModels;

    protected ?Facility $facility;
    protected EmailTemplateService $templateService;

    public function __construct(
        public CleaningTaskAssignment $assignment,
        public ?User $assignedBy = null,
        ?Facility $facility = null
    ) {
        $this->facility = $facility;
        $this->templateService = app(EmailTemplateService::class);
    }

    public function envelope(): Envelope
    {
        $taskTitle = $this->assignment->task?->title ?? 'New Task';
        $scheduledDate = Carbon::parse($this->assignment->scheduled_date)->format('M d, Y');
        $defaultSubject = "New Task Assigned: {$taskTitle} - {$scheduledDate}";
        
        // Use custom template if available
        if ($this->facility) {
            $variables = [
                'taskTitle' => $taskTitle,
                'scheduledDate' => $scheduledDate,
            ];
            $subject = $this->templateService->renderSubject(
                $this->facility,
                'task_assignment',
                $variables,
                $defaultSubject
            );
        } else {
            $subject = $defaultSubject;
        }
        
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $task = $this->assignment->task;
        $area = $task?->area;
        $scheduledDate = Carbon::parse($this->assignment->scheduled_date)->format('l, F j, Y');
        $assignedByName = $this->assignedBy?->name ?? 'Administrator';
        
        $variables = [
            'taskTitle' => $task?->title ?? 'Task',
            'taskInstructions' => $task?->instructions ?? 'No specific instructions provided.',
            'areaName' => $area?->name ?? 'General',
            'scheduledDate' => $scheduledDate,
            'assignedByName' => $assignedByName,
            'estimatedMinutes' => $task?->estimated_minutes ?? '',
            'status' => ucfirst($this->assignment->status ?? 'assigned'),
        ];
        
        // Use custom template if available
        if ($this->facility) {
            $htmlContent = $this->templateService->renderHtml(
                $this->facility,
                'task_assignment',
                $variables,
                'mail.task-assignment',
                $variables
            );
            
            return new Content(
                htmlString: $htmlContent
            );
        }
        
        // Fallback to default blade template
        return new Content(
            text: 'mail.task-assignment',
            with: $variables,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
