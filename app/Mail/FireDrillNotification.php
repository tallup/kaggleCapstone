<?php

namespace App\Mail;

use App\Models\FireDrill;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class FireDrillNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public FireDrill $fireDrill
    ) {}

    public function envelope(): Envelope
    {
        $branchName = $this->fireDrill->branch?->name ?? 'Branch';
        $drillDate = $this->fireDrill->scheduled_date ? Carbon::parse($this->fireDrill->scheduled_date)->format('M d, Y') : 'TBD';
        
        return new Envelope(
            subject: "Fire Drill Scheduled: {$branchName} - {$drillDate}",
        );
    }

    public function content(): Content
    {
        $branchName = $this->fireDrill->branch?->name ?? 'Branch';
        $drillDate = $this->fireDrill->scheduled_date ? Carbon::parse($this->fireDrill->scheduled_date)->format('M d, Y') : 'TBD';
        $drillTime = $this->fireDrill->scheduled_time ? Carbon::parse($this->fireDrill->scheduled_time)->format('g:i A') : 'TBD';
        $createdByName = $this->fireDrill->createdBy 
            ? trim(($this->fireDrill->createdBy->first_name ?? '') . ' ' . ($this->fireDrill->createdBy->last_name ?? ''))
            : 'Staff';
        
        return new Content(
            text: 'mail.fire-drill',
            with: [
                'branchName' => $branchName,
                'drillDate' => $drillDate,
                'drillTime' => $drillTime,
                'createdByName' => $createdByName,
                'drillType' => $this->fireDrill->drill_type,
                'status' => $this->fireDrill->status,
                'notes' => $this->fireDrill->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

