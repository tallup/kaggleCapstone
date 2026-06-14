@if($eventType === 'created')
New Appointment Scheduled

Resident: {{ $residentName }}
Appointment Type: {{ $appointmentType }}
Date: {{ $date }}
Time: {{ $time }}
@if($location)
Location: {{ $location }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

Please ensure the resident is prepared for this appointment.

@elseif($eventType === 'completed')
Appointment Completed

Resident: {{ $residentName }}
Appointment Type: {{ $appointmentType }}
Date: {{ $date }}
Time: {{ $time }}

This appointment has been marked as completed.

@endif

Thank you,
{{ config('mail.from.name') }}

