<?php

namespace App\Mail;

use App\Models\ResidentContact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FamilyPortalInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ResidentContact $contact,
        public string $inviteLink
    ) {}

    public function envelope(): Envelope
    {
        $facilityName = $this->contact->resident?->branch?->facility?->name ?? 'Care Home';

        return new Envelope(
            subject: "Family Portal invite – {$facilityName}",
        );
    }

    public function content(): Content
    {
        $contactName = $this->contact->name;
        $residentName = $this->contact->resident?->name ?? 'your loved one';
        $facilityName = $this->contact->resident?->branch?->facility?->name ?? 'the care home';

        return new Content(
            text: 'mail.family-portal-invite',
            with: [
                'contactName' => $contactName,
                'residentName' => $residentName,
                'facilityName' => $facilityName,
                'inviteLink' => $this->inviteLink,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
