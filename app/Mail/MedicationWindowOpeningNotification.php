<?php

namespace App\Mail;

use App\Models\Medication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MedicationWindowOpeningNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Medication $medication,
        public string $scheduledTime,
        public string $windowStartTime,
        public string $windowEndTime
    ) {}

    public function envelope(): Envelope
    {
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));
        
        return new Envelope(
            subject: "Medication Administration Window Opening - {$medicationName} - {$residentName}",
        );
    }

    public function content(): Content
    {
        // Load relationships if not already loaded
        if (!$this->medication->relationLoaded('resident')) {
            $this->medication->load('resident');
        }
        if (!$this->medication->relationLoaded('drug')) {
            $this->medication->load('drug');
        }
        
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));
        
        return new Content(
            text: 'mail.medication-window-opening',
            with: [
                'medicationName' => $medicationName,
                'residentName' => $residentName,
                'scheduledTime' => $this->scheduledTime,
                'windowStartTime' => $this->windowStartTime,
                'windowEndTime' => $this->windowEndTime,
                'instructions' => $this->medication->instructions,
                'dosage' => $this->medication->quantity ?? 'Not specified',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

