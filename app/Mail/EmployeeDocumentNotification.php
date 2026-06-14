<?php

namespace App\Mail;

use App\Models\EmployeeDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class EmployeeDocumentNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public EmployeeDocument $document,
        public string $eventType // 'uploaded', 'expiring', 'expired'
    ) {}

    public function envelope(): Envelope
    {
        $documentName = $this->document->document_name ?? 'Document';
        $staffName = trim(($this->document->staff->first_name ?? '') . ' ' . ($this->document->staff->last_name ?? ''));
        
        $subject = match($this->eventType) {
            'uploaded' => "New Document Uploaded: {$documentName} - {$staffName}",
            'expiring' => "Document Expiring Soon: {$documentName} - {$staffName}",
            'expired' => "Document Expired: {$documentName} - {$staffName}",
            default => "Document Update: {$documentName} - {$staffName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $documentName = $this->document->document_name ?? 'Document';
        $staffName = trim(($this->document->staff->first_name ?? '') . ' ' . ($this->document->staff->last_name ?? ''));
        $documentType = $this->document->document_type ?? 'General';
        $expiryDate = $this->document->expiry_date ? Carbon::parse($this->document->expiry_date)->format('M d, Y') : null;
        $uploadedByName = $this->document->uploadedBy 
            ? trim(($this->document->uploadedBy->first_name ?? '') . ' ' . ($this->document->uploadedBy->last_name ?? ''))
            : 'Staff';
        
        return new Content(
            text: 'mail.employee-document',
            with: [
                'documentName' => $documentName,
                'staffName' => $staffName,
                'documentType' => $documentType,
                'expiryDate' => $expiryDate,
                'uploadedByName' => $uploadedByName,
                'eventType' => $this->eventType,
                'notes' => $this->document->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

