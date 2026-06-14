<?php

namespace App\Mail;

use App\Models\Medication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MedicationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Medication $medication
    ) {}

    public function envelope(): Envelope
    {
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));
        
        return new Envelope(
            subject: "New Medication Added: {$medicationName} - {$residentName}",
        );
    }

    public function content(): Content
    {
        // Load relationships if not already loaded
        if (!$this->medication->relationLoaded('drug')) {
            $this->medication->load('drug');
        }
        if (!$this->medication->relationLoaded('createdBy')) {
            $this->medication->load('createdBy');
        }
        
        $medicationName = $this->medication->drug?->name ?? $this->medication->name;
        $residentName = trim(($this->medication->resident->first_name ?? '') . ' ' . ($this->medication->resident->last_name ?? ''));
        
        // Map instructions to readable frequency
        $frequency = 'Not specified';
        if ($this->medication->instructions) {
            $instructionMap = [
                't.i.d' => 'Thrice daily',
                't.i.d.' => 'Thrice daily',
                'tid' => 'Thrice daily',
                'q.i.d' => 'Four times a day',
                'q.i.d.' => 'Four times a day',
                'qid' => 'Four times a day',
                'b.i.d' => 'Twice daily',
                'b.i.d.' => 'Twice daily',
                'bid' => 'Twice daily',
                'PRN' => 'As needed',
                'prn' => 'As needed',
                'h.s' => 'Hour of sleep',
                'h.s.' => 'Hour of sleep',
                'hs' => 'Hour of sleep',
                'a.m' => 'Morning',
                'am' => 'Morning',
                'p.m' => 'Evening',
                'pm' => 'Evening',
            ];
            
            $instruction = strtolower(trim($this->medication->instructions));
            $frequency = $instructionMap[$instruction] ?? $this->medication->instructions;
        }
        
        // Build dosage from quantity and drug strength
        $dosage = 'Not specified';
        if ($this->medication->quantity) {
            $dosage = $this->medication->quantity;
            // If drug has strength, prepend it
            if ($this->medication->drug?->strength) {
                $dosage = $this->medication->drug->strength . ' - ' . $dosage;
            }
        } elseif ($this->medication->drug?->strength) {
            $dosage = $this->medication->drug->strength;
        }
        
        // Route from drug dosage_form
        $route = 'Not specified';
        if ($this->medication->drug?->dosage_form) {
            $route = ucfirst($this->medication->drug->dosage_form);
        }
        
        // Get creator name
        $createdBy = 'System';
        if ($this->medication->createdBy) {
            $createdBy = trim(($this->medication->createdBy->first_name ?? '') . ' ' . ($this->medication->createdBy->last_name ?? ''));
            if (empty($createdBy)) {
                $createdBy = $this->medication->createdBy->name ?? $this->medication->createdBy->email ?? 'System';
            }
        }
        
        return new Content(
            text: 'mail.medication',
            with: [
                'medicationName' => $medicationName,
                'residentName' => $residentName,
                'dosage' => $dosage,
                'frequency' => $frequency,
                'route' => $route,
                'startDate' => $this->medication->start_date?->format('M d, Y'),
                'endDate' => $this->medication->end_date?->format('M d, Y'),
                'instructions' => $this->medication->instructions,
                'notes' => $this->medication->notes,
                'createdBy' => $createdBy,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

