<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Models\Facility;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class AppointmentNotification extends Mailable
{
    use Queueable, SerializesModels;

    protected ?Facility $facility;
    protected EmailTemplateService $templateService;

    public function __construct(
        public Appointment $appointment,
        public string $eventType, // 'created', 'completed'
        ?Facility $facility = null
    ) {
        $this->facility = $facility;
        $this->templateService = app(EmailTemplateService::class);
    }

    public function envelope(): Envelope
    {
        $residentName = trim(($this->appointment->resident->first_name ?? '') . ' ' . ($this->appointment->resident->last_name ?? ''));
        $appointmentType = $this->appointment->appointmentType?->name ?? 'General';
        
        $defaultSubject = match($this->eventType) {
            'created' => "New Appointment: {$appointmentType} for {$residentName}",
            'completed' => "Appointment Completed: {$appointmentType} for {$residentName}",
            default => "Appointment Update: {$appointmentType} for {$residentName}",
        };
        
        if ($this->facility) {
            $variables = [
                'residentName' => $residentName,
                'appointmentType' => $appointmentType,
                'eventType' => $this->eventType,
            ];
            $subject = $this->templateService->renderSubject(
                $this->facility,
                'appointment_reminder',
                $variables,
                $defaultSubject
            );
        } else {
            $subject = $defaultSubject;
        }
        
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $residentName = trim(($this->appointment->resident->first_name ?? '') . ' ' . ($this->appointment->resident->last_name ?? ''));
        $appointmentType = $this->appointment->appointmentType?->name ?? 'General';
        $date = $this->appointment->appointment_date
            ? Carbon::parse($this->appointment->appointment_date)->format('M d, Y')
            : 'TBD';
        $time = 'TBD';
        if ($this->appointment->appointment_time) {
            try {
                $timeParts = explode(':', $this->appointment->appointment_time);
                if (count($timeParts) >= 2) {
                    $hours = (int)$timeParts[0];
                    $minutes = (int)$timeParts[1];
                    $time = Carbon::createFromTime($hours, $minutes)->format('g:i A');
                }
            } catch (\Exception $e) {
                $time = 'TBD';
            }
        }
        
        $variables = [
            'residentName' => $residentName,
            'appointmentType' => $appointmentType,
            'date' => $date,
            'time' => $time,
            'eventType' => $this->eventType,
            'status' => $this->appointment->status,
            'location' => $this->appointment->location,
            'notes' => $this->appointment->notes,
        ];
        
        if ($this->facility) {
            $htmlContent = $this->templateService->renderHtml(
                $this->facility,
                'appointment_reminder',
                $variables,
                'mail.appointment',
                $variables
            );
            
            return new Content(htmlString: $htmlContent);
        }
        
        return new Content(
            text: 'mail.appointment',
            with: $variables,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

