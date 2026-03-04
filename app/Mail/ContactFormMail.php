<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use Queueable, SerializesModels;

    /** Recipient (and fallback From) for contact form - must be verified in SES */
    public const SUPPORT_EMAIL = 'support@homelogic360.com';

    public function __construct(
        public string $name,
        public string $email,
        public ?string $phone,
        public string $subject,
        public string $messageText
    ) {}

    public function envelope(): Envelope
    {
        $subjectLine = 'Contact form: ' . $this->subject;
        if (strlen($subjectLine) > 78) {
            $subjectLine = substr($subjectLine, 0, 75) . '...';
        }

        $fromAddress = config('mail.from.address');
        $fromName = config('mail.from.name', 'HomeLogic360');
        if (empty($fromAddress) || $fromAddress === 'hello@example.com') {
            $fromAddress = self::SUPPORT_EMAIL;
            $fromName = 'HomeLogic360 Contact';
        }

        return new Envelope(
            from: new Address($fromAddress, $fromName),
            subject: $subjectLine,
            replyTo: [new Address($this->email, $this->name)],
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.contact-form',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
