<?php

namespace App\Mail;

use App\Models\SleepRecord;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class SleepRecordNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SleepRecord $sleepRecord
    ) {}

    public function envelope(): Envelope
    {
        $residentName = trim(($this->sleepRecord->resident->first_name ?? '') . ' ' . ($this->sleepRecord->resident->last_name ?? ''));
        
        return new Envelope(
            subject: "Sleep Record Added - {$residentName}",
        );
    }

    public function content(): Content
    {
        $residentName = trim(($this->sleepRecord->resident->first_name ?? '') . ' ' . ($this->sleepRecord->resident->last_name ?? ''));
        $createdByName = $this->sleepRecord->createdBy 
            ? trim(($this->sleepRecord->createdBy->first_name ?? '') . ' ' . ($this->sleepRecord->createdBy->last_name ?? ''))
            : 'Staff';
        $sleepDate = $this->sleepRecord->sleep_date ? Carbon::parse($this->sleepRecord->sleep_date)->format('M d, Y') : 'TBD';
        $totalHours = $this->sleepRecord->total_sleep_hours ?? 0;
        
        return new Content(
            text: 'mail.sleep-record',
            with: [
                'residentName' => $residentName,
                'createdByName' => $createdByName,
                'sleepDate' => $sleepDate,
                'totalHours' => number_format($totalHours, 2),
                'bedtime' => $this->sleepRecord->bedtime,
                'wakeTime' => $this->sleepRecord->wake_time,
                'notes' => $this->sleepRecord->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

