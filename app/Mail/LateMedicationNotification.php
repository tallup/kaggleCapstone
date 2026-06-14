<?php

namespace App\Mail;

use App\Models\Facility;
use App\Models\Medication;
use App\Models\Resident;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LateMedicationNotification extends Mailable
{
    use Queueable, SerializesModels;

    protected ?Facility $facility;
    protected EmailTemplateService $templateService;

    public function __construct(
        public Medication $medication,
        public Resident $resident,
        public string $scheduledTime,
        ?Facility $facility = null
    ) {
        $this->facility = $facility;
        $this->templateService = app(EmailTemplateService::class);
    }

    public function envelope(): Envelope
    {
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $defaultSubject = 'Late Medication Alert - ' . $medicationName;
        
        if ($this->facility) {
            $variables = [
                'medicationName' => $medicationName,
                'scheduledTime' => $this->scheduledTime,
            ];
            $subject = $this->templateService->renderSubject(
                $this->facility,
                'late_medication',
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
        $residentName = trim(($this->resident->first_name ?? '') . ' ' . ($this->resident->last_name ?? ''));
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        
        $variables = [
            'residentName' => $residentName,
            'medicationName' => $medicationName,
            'scheduledTime' => $this->scheduledTime,
        ];
        
        if ($this->facility) {
            $htmlContent = $this->templateService->renderHtml(
                $this->facility,
                'late_medication',
                $variables,
                'mail.late-medication',
                $variables
            );
            
            return new Content(htmlString: $htmlContent);
        }
        
        return new Content(
            text: 'mail.late-medication',
            with: $variables,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
