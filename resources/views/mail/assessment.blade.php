@if($eventType === 'created')
New Assessment Created

Resident: {{ $residentName }}
Assessment Type: {{ $assessmentType }}
Conducted By: {{ $conductedByName }}
Date: {{ $assessmentDate }}
Status: {{ ucfirst($status) }}
@if($notes)
Notes: {{ $notes }}
@endif

A new assessment has been created and requires review.

@elseif($eventType === 'completed')
Assessment Completed

Resident: {{ $residentName }}
Assessment Type: {{ $assessmentType }}
Conducted By: {{ $conductedByName }}
Date: {{ $assessmentDate }}
Status: {{ ucfirst($status) }}

This assessment has been marked as completed.

@endif

Thank you,
{{ config('mail.from.name') }}

