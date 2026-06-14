<?php

namespace App\Mail;

use App\Models\MedicationDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class MedicationDeliveryNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public MedicationDelivery $delivery
    ) {}

    public function envelope(): Envelope
    {
        $residentName = trim(($this->delivery->resident->first_name ?? '') . ' ' . ($this->delivery->resident->last_name ?? ''));
        
        return new Envelope(
            subject: "Medication Delivery Received - {$residentName}",
        );
    }

    public function content(): Content
    {
        $residentName = trim(($this->delivery->resident->first_name ?? '') . ' ' . ($this->delivery->resident->last_name ?? ''));
        $medicationName = $this->delivery->medication_name ?? 'Medication';
        $receivedByName = $this->delivery->receivedBy 
            ? trim(($this->delivery->receivedBy->first_name ?? '') . ' ' . ($this->delivery->receivedBy->last_name ?? ''))
            : 'Staff';
        $deliveryDate = $this->delivery->delivery_date ? Carbon::parse($this->delivery->delivery_date)->format('M d, Y') : 'TBD';
        
        return new Content(
            text: 'mail.medication-delivery',
            with: [
                'residentName' => $residentName,
                'medicationName' => $medicationName,
                'receivedByName' => $receivedByName,
                'deliveryDate' => $deliveryDate,
                'quantity' => $this->delivery->quantity,
                'supplier' => $this->delivery->supplier,
                'notes' => $this->delivery->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

