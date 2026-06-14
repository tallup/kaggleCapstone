<?php

namespace App\Mail;

use App\Models\CleaningTask;
use App\Models\User;
use App\Models\Facility;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class CleaningTaskCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    protected ?Facility $facility;
    protected EmailTemplateService $templateService;

    public function __construct(
        public CleaningTask $task,
        public User $completedBy,
        public string $scheduledDate,
        public ?string $notes = null,
        public ?string $completedAt = null,
        ?Facility $facility = null
    ) {
        $this->facility = $facility;
        // Check if service exists in container, otherwise we might fail if not bound.
        // Assuming standard app binding.
        $this->templateService = app(EmailTemplateService::class);
    }

    public function envelope(): Envelope
    {
        $taskTitle = $this->task->title;
        $date = Carbon::parse($this->scheduledDate)->format('M d, Y');
        $defaultSubject = "Task Completed: {$taskTitle} - {$date}";
        
        // Use custom template if available
        if ($this->facility) {
            $variables = [
                'taskTitle' => $taskTitle,
                'scheduledDate' => $date,
                'completedByName' => $this->completedBy->name,
            ];
            
            // We use a key for the template. If it doesn't exist, service should handle or we fallback.
            $subject = $this->templateService->renderSubject(
                $this->facility,
                'cleaning_task_completed',
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
        $area = $this->task->area;
        $scheduledDateFormatted = Carbon::parse($this->scheduledDate)->format('l, F j, Y');
        
        $variables = [
            'taskTitle' => $this->task->title,
            'areaName' => $area?->name ?? 'Housekeeping',
            'scheduledDate' => $scheduledDateFormatted,
            'completedByName' => $this->completedBy->name,
            'completedAt' => $this->completedAt ?? now()->format('H:i'),
            'notes' => $this->notes,
        ];
        
        if ($this->facility) {
             $htmlContent = $this->templateService->renderHtml(
                $this->facility,
                'cleaning_task_completed',
                $variables,
                'mail.cleaning-task-completed',
                $variables
            );
            
            return new Content(
                htmlString: $htmlContent
            );
        }
        
        return new Content(
            text: 'mail.cleaning-task-completed',
            with: $variables,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
