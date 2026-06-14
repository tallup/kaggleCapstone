<?php

namespace App\Mail;

use App\Models\VitalSign;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class VitalSignNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public VitalSign $vitalSign,
        public bool $isCritical = false
    ) {}

    public function envelope(): Envelope
    {
        $residentName = trim(($this->vitalSign->resident->first_name ?? '') . ' ' . ($this->vitalSign->resident->last_name ?? ''));
        
        $subject = $this->isCritical 
            ? "CRITICAL: Vital Signs Alert - {$residentName}"
            : "Vital Signs Recorded - {$residentName}";
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $residentName = trim(($this->vitalSign->resident->first_name ?? '') . ' ' . ($this->vitalSign->resident->last_name ?? ''));
        $takenByName = $this->vitalSign->takenBy 
            ? trim(($this->vitalSign->takenBy->first_name ?? '') . ' ' . ($this->vitalSign->takenBy->last_name ?? ''))
            : 'Staff';
        $measurementDate = $this->vitalSign->measurement_date ? Carbon::parse($this->vitalSign->measurement_date)->format('M d, Y') : 'TBD';
        
        // Build vital signs summary
        $vitalsSummary = [];
        if ($this->vitalSign->systolic && $this->vitalSign->diastolic) {
            $vitalsSummary[] = "BP: {$this->vitalSign->systolic}/{$this->vitalSign->diastolic}";
        }
        if ($this->vitalSign->temperature) {
            $vitalsSummary[] = "Temp: {$this->vitalSign->temperature}°F";
        }
        if ($this->vitalSign->pulse) {
            $vitalsSummary[] = "Pulse: {$this->vitalSign->pulse} BPM";
        }
        if ($this->vitalSign->oxygen_saturation) {
            $vitalsSummary[] = "O2: {$this->vitalSign->oxygen_saturation}%";
        }
        $vitalsStr = !empty($vitalsSummary) ? implode(', ', $vitalsSummary) : 'N/A';
        
        return new Content(
            text: 'mail.vital-sign',
            with: [
                'residentName' => $residentName,
                'takenByName' => $takenByName,
                'measurementDate' => $measurementDate,
                'vitalsSummary' => $vitalsStr,
                'isCritical' => $this->isCritical,
                'status' => $this->vitalSign->status,
                'notes' => $this->vitalSign->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

