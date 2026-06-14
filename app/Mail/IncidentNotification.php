<?php

namespace App\Mail;

use App\Models\Incident;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class IncidentNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Incident $incident,
        public string $eventType // 'reported', 'assigned', 'resolved', 'closed', 'escalated'
    ) {}

    public function envelope(): Envelope
    {
        $residentName = trim(($this->incident->resident->first_name ?? '') . ' ' . ($this->incident->resident->last_name ?? ''));
        $incidentNumber = $this->incident->incident_number ?? 'N/A';
        
        $subject = match($this->eventType) {
            'reported' => "New Incident #{$incidentNumber}: {$this->incident->incident_type} - {$residentName}",
            'assigned' => "Incident Assigned to You: #{$incidentNumber}",
            'resolved' => "Incident Resolved: #{$incidentNumber}",
            'closed' => "Incident Closed: #{$incidentNumber}",
            'escalated' => "CRITICAL: Incident Escalated #{$incidentNumber}",
            default => "Incident Update: #{$incidentNumber}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $residentName = trim(($this->incident->resident->first_name ?? '') . ' ' . ($this->incident->resident->last_name ?? ''));
        $reportedByName = $this->incident->reportedBy 
            ? trim(($this->incident->reportedBy->first_name ?? '') . ' ' . ($this->incident->reportedBy->last_name ?? ''))
            : 'Staff';
        $incidentDate = $this->incident->incident_date ? Carbon::parse($this->incident->incident_date)->format('M d, Y g:i A') : 'TBD';
        $incidentNumber = $this->incident->incident_number ?? 'N/A';
        $location = $this->incident->location ? " at {$this->incident->location}" : '';
        
        return new Content(
            text: 'mail.incident',
            with: [
                'incidentNumber' => $incidentNumber,
                'incidentType' => $this->incident->incident_type,
                'residentName' => $residentName,
                'reportedByName' => $reportedByName,
                'incidentDate' => $incidentDate,
                'location' => $location,
                'severity' => $this->incident->severity,
                'priority' => $this->incident->priority,
                'status' => $this->incident->status,
                'description' => $this->incident->description,
                'eventType' => $this->eventType,
                'assignedToName' => $this->incident->assignedTo 
                    ? trim(($this->incident->assignedTo->first_name ?? '') . ' ' . ($this->incident->assignedTo->last_name ?? ''))
                    : null,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

