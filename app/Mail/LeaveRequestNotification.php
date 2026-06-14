<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class LeaveRequestNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LeaveRequest $leaveRequest,
        public string $eventType // 'created', 'approved', 'declined'
    ) {}

    public function envelope(): Envelope
    {
        $staffName = trim(($this->leaveRequest->staff->first_name ?? '') . ' ' . ($this->leaveRequest->staff->last_name ?? ''));
        
        $subject = match($this->eventType) {
            'created' => "New Leave Request from {$staffName}",
            'approved' => "Leave Request Approved for {$staffName}",
            'declined' => "Leave Request Declined for {$staffName}",
            default => "Leave Request Update for {$staffName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $staffName = trim(($this->leaveRequest->staff->first_name ?? '') . ' ' . ($this->leaveRequest->staff->last_name ?? ''));
        $startDate = $this->leaveRequest->start_date ? Carbon::parse($this->leaveRequest->start_date)->format('M d, Y') : 'TBD';
        $endDate = $this->leaveRequest->end_date ? Carbon::parse($this->leaveRequest->end_date)->format('M d, Y') : 'TBD';
        $duration = $this->leaveRequest->duration ?? 0;
        $approvedByName = $this->leaveRequest->approvedBy 
            ? trim(($this->leaveRequest->approvedBy->first_name ?? '') . ' ' . ($this->leaveRequest->approvedBy->last_name ?? ''))
            : 'Administrator';
        
        return new Content(
            text: 'mail.leave-request',
            with: [
                'staffName' => $staffName,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'duration' => $duration,
                'eventType' => $this->eventType,
                'status' => $this->leaveRequest->status,
                'reason' => $this->leaveRequest->reason,
                'approvedByName' => $approvedByName,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

