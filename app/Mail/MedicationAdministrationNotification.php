<?php

namespace App\Mail;

use App\Models\MedicationAdministration;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class MedicationAdministrationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public MedicationAdministration $administration
    ) {}

    public function envelope(): Envelope
    {
        $medicationName = $this->administration->medication->drug?->name ?? $this->administration->medication->name ?? 'Medication';
        $residentName = trim(($this->administration->resident->first_name ?? '') . ' ' . ($this->administration->resident->last_name ?? ''));
        
        return new Envelope(
            subject: "Medication Administered: {$medicationName} - {$residentName}",
        );
    }

    public function content(): Content
    {
        $medicationName = $this->administration->medication->drug?->name ?? $this->administration->medication->name ?? 'Medication';
        $residentName = trim(($this->administration->resident->first_name ?? '') . ' ' . ($this->administration->resident->last_name ?? ''));
        $administeredByName = trim(($this->administration->administeredBy->first_name ?? '') . ' ' . ($this->administration->administeredBy->last_name ?? ''));
        $administeredAt = $this->administration->administered_at 
            ? Carbon::parse($this->administration->administered_at)->format('M d, Y g:i A') 
            : 'TBD';
        
        return new Content(
            text: 'mail.medication-administration',
            with: [
                'medicationName' => $medicationName,
                'residentName' => $residentName,
                'administeredByName' => $administeredByName,
                'administeredAt' => $administeredAt,
                'dosageGiven' => $this->administration->dosage_given,
                'status' => $this->administration->status,
                'notes' => $this->administration->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

