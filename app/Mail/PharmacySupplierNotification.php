<?php

namespace App\Mail;

use App\Models\PharmacySupplier;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PharmacySupplierNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PharmacySupplier $supplier,
        public string $eventType // 'created', 'updated'
    ) {}

    public function envelope(): Envelope
    {
        $subject = match($this->eventType) {
            'created' => "New Pharmacy Supplier: {$this->supplier->name}",
            'updated' => "Pharmacy Supplier Updated: {$this->supplier->name}",
            default => "Pharmacy Supplier Update: {$this->supplier->name}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.pharmacy-supplier',
            with: [
                'supplierName' => $this->supplier->name,
                'contactName' => $this->supplier->contact_name,
                'email' => $this->supplier->email,
                'phone' => $this->supplier->phone,
                'address' => $this->supplier->address,
                'eventType' => $this->eventType,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

