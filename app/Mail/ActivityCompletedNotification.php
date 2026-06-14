<?php

namespace App\Mail;

use App\Models\User;
use App\Models\Facility;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class ActivityCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    protected ?Facility $facility;
    protected EmailTemplateService $templateService;

    /**
     * Create a new message instance.
     *
     * @param string $title The title of the activity (e.g. "Medication Administered")
     * @param array $details Key-value pairs of details to display
     * @param User $performer The user who performed the activity
     * @param string|Carbon $timestamp When it happened
     * @param Facility|null $facility
     * @param string|null $actionUrl Optional URL to view details
     */
    public function __construct(
        public string $title,
        public array $details,
        public User $performer,
        public $timestamp,
        ?Facility $facility = null,
        public ?string $actionUrl = null
    ) {
        $this->facility = $facility;
        $this->templateService = app(EmailTemplateService::class);
    }

    public function envelope(): Envelope
    {
        $date = Carbon::parse($this->timestamp)->format('M d, Y H:i');
        $subject = "{$this->title} - {$this->performer->name} ({$date})";
        
        // Use custom template if available
        if ($this->facility) {
            $variables = [
                'title' => $this->title,
                'performerName' => $this->performer->name,
                'date' => $date,
            ];
            
            // We use a generic key 'activity_completed' or specific if we wanted complex logic
            // For now, let's stick to a generic subject override
            $subject = $this->templateService->renderSubject(
                $this->facility,
                'activity_completed',
                $variables,
                $subject
            );
        }
        
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $variables = [
            'title' => $this->title,
            'details' => $this->details,
            'performerName' => $this->performer->name,
            'timestamp' => Carbon::parse($this->timestamp)->format('l, F j, Y g:i A'),
            'actionUrl' => $this->actionUrl,
        ];
        
        if ($this->facility) {
             $htmlContent = $this->templateService->renderHtml(
                $this->facility,
                'activity_completed',
                $variables,
                'mail.activity-completed',
                $variables
            );
            
            return new Content(
                htmlString: $htmlContent
            );
        }
        
        return new Content(
            markdown: 'mail.activity-completed',
            with: $variables,
        );
    }
}
