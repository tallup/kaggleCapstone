<?php

namespace App\Mail;

use App\Models\Visitor;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class VisitorNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Visitor $visitor,
        public string $eventType // 'checked_in', 'checked_out'
    ) {}

    public function envelope(): Envelope
    {
        $visitorName = $this->visitor->name ?? 'Visitor';
        $residentName = trim(($this->visitor->resident->first_name ?? '') . ' ' . ($this->visitor->resident->last_name ?? ''));
        
        $subject = match($this->eventType) {
            'checked_in' => "Visitor Checked In: {$visitorName} visiting {$residentName}",
            'checked_out' => "Visitor Checked Out: {$visitorName}",
            default => "Visitor Update: {$visitorName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $visitorName = $this->visitor->name ?? 'Visitor';
        $residentName = trim(($this->visitor->resident->first_name ?? '') . ' ' . ($this->visitor->resident->last_name ?? ''));
        $checkInTime = $this->visitor->check_in_time ? Carbon::parse($this->visitor->check_in_time)->format('M d, Y g:i A') : 'TBD';
        $checkOutTime = $this->visitor->check_out_time ? Carbon::parse($this->visitor->check_out_time)->format('M d, Y g:i A') : null;
        $relationship = $this->visitor->relationship ?? 'Not specified';
        
        return new Content(
            text: 'mail.visitor',
            with: [
                'visitorName' => $visitorName,
                'residentName' => $residentName,
                'checkInTime' => $checkInTime,
                'checkOutTime' => $checkOutTime,
                'relationship' => $relationship,
                'eventType' => $this->eventType,
                'purpose' => $this->visitor->purpose,
                'notes' => $this->visitor->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

