<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use Queueable, SerializesModels;

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

        return new Envelope(
            subject: $subjectLine,
            replyTo: [$this->email],
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
