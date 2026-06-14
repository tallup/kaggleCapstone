<?php

namespace App\Mail;

use App\Models\Assessment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class AssessmentNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Assessment $assessment,
        public string $eventType // 'created', 'completed'
    ) {}

    public function envelope(): Envelope
    {
        $residentName = trim(($this->assessment->resident->first_name ?? '') . ' ' . ($this->assessment->resident->last_name ?? ''));
        $assessmentType = $this->assessment->assessmentType?->name ?? 'Assessment';
        
        $subject = match($this->eventType) {
            'created' => "New Assessment: {$assessmentType} - {$residentName}",
            'completed' => "Assessment Completed: {$assessmentType} - {$residentName}",
            default => "Assessment Update: {$assessmentType} - {$residentName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $residentName = trim(($this->assessment->resident->first_name ?? '') . ' ' . ($this->assessment->resident->last_name ?? ''));
        $assessmentType = $this->assessment->assessmentType?->name ?? 'Assessment';
        $conductedByName = $this->assessment->conductedBy 
            ? trim(($this->assessment->conductedBy->first_name ?? '') . ' ' . ($this->assessment->conductedBy->last_name ?? ''))
            : 'Staff';
        $assessmentDate = $this->assessment->assessment_date ? Carbon::parse($this->assessment->assessment_date)->format('M d, Y') : 'TBD';
        
        return new Content(
            text: 'mail.assessment',
            with: [
                'residentName' => $residentName,
                'assessmentType' => $assessmentType,
                'conductedByName' => $conductedByName,
                'assessmentDate' => $assessmentDate,
                'eventType' => $this->eventType,
                'status' => $this->assessment->status,
                'notes' => $this->assessment->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

