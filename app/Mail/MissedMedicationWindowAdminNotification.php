<?php

namespace App\Mail;

use App\Models\Medication;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MissedMedicationWindowAdminNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Medication $medication,
        public Carbon $scheduledTime,
        public string $windowEndFormatted,
    ) {}

    public function envelope(): Envelope
    {
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));

        return new Envelope(
            subject: "Missed medication dose — {$medicationName} — {$residentName}",
        );
    }

    public function content(): Content
    {
        if (!$this->medication->relationLoaded('resident')) {
            $this->medication->load('resident');
        }
        if (!$this->medication->relationLoaded('drug')) {
            $this->medication->load('drug');
        }

        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));

        return new Content(
            text: 'mail.missed-medication-window-admin',
            with: [
                'medicationName' => $medicationName,
                'residentName' => $residentName,
                'scheduledTime' => $this->scheduledTime->format('g:i A'),
                'scheduledDate' => $this->scheduledTime->format('M j, Y'),
                'windowEndFormatted' => $this->windowEndFormatted,
                'dosage' => $this->medication->quantity ?? 'Not specified',
                'instructions' => $this->medication->instructions,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
