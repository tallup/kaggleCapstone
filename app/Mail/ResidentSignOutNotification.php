<?php

namespace App\Mail;

use App\Models\ResidentSignOut;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class ResidentSignOutNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ResidentSignOut $signOut,
        public string $eventType // 'signed_out', 'returned'
    ) {}

    public function envelope(): Envelope
    {
        // Ensure relationships are loaded
        $this->signOut->loadMissing(['resident', 'createdBy']);
        
        $residentName = $this->signOut->resident?->name 
            ?? trim(($this->signOut->resident->first_name ?? '') . ' ' . ($this->signOut->resident->last_name ?? ''))
            ?? 'Resident';
        
        $subject = match($this->eventType) {
            'signed_out' => "Resident Signed Out: {$residentName}",
            'returned' => "Resident Returned: {$residentName}",
            default => "Resident Sign-Out Update: {$residentName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        // Ensure relationships are loaded
        $this->signOut->loadMissing(['resident', 'createdBy', 'signedInBy']);
        
        // Get resident name
        $residentName = $this->signOut->resident?->name 
            ?? trim(($this->signOut->resident->first_name ?? '') . ' ' . ($this->signOut->resident->last_name ?? ''))
            ?? 'Resident';
        
        // Get staff name who created the sign-out (signed out by)
        $signedOutByName = 'Staff';
        if ($this->signOut->createdBy) {
            $signedOutByName = $this->signOut->createdBy->name 
                ?? trim(($this->signOut->createdBy->first_name ?? '') . ' ' . ($this->signOut->createdBy->last_name ?? ''))
                ?? $this->signOut->createdBy->email
                ?? 'Staff';
        }
        
        // Use correct column names: sign_out_at and sign_in_at
        $signOutDate = $this->signOut->sign_out_at 
            ? Carbon::parse($this->signOut->sign_out_at)->format('M d, Y g:i A') 
            : 'TBD';
        
        $returnDate = $this->signOut->sign_in_at 
            ? Carbon::parse($this->signOut->sign_in_at)->format('M d, Y g:i A') 
            : null;
        
        $destination = $this->signOut->destination ?? 'Not specified';
        $accompaniedBy = $this->signOut->accompanied_by ?? 'Not specified';
        
        // Use correct column name: expected_return_at
        $expectedReturnTime = $this->signOut->expected_return_at 
            ? Carbon::parse($this->signOut->expected_return_at)->format('M d, Y g:i A') 
            : null;
        
        return new Content(
            text: 'mail.resident-sign-out',
            with: [
                'residentName' => $residentName,
                'signedOutByName' => $signedOutByName,
                'signOutDate' => $signOutDate,
                'returnDate' => $returnDate,
                'destination' => $destination,
                'accompaniedBy' => $accompaniedBy,
                'eventType' => $this->eventType,
                'expectedReturnTime' => $expectedReturnTime,
                'notes' => $this->signOut->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

