@if($isCritical)
CRITICAL: Vital Signs Alert

Resident: {{ $residentName }}
Recorded By: {{ $takenByName }}
Date: {{ $measurementDate }}
Vital Signs: {{ $vitalsSummary }}
Status: {{ ucfirst($status) }}

CRITICAL: These vital signs require immediate attention.

@else
Vital Signs Recorded

Resident: {{ $residentName }}
Recorded By: {{ $takenByName }}
Date: {{ $measurementDate }}
Vital Signs: {{ $vitalsSummary }}
Status: {{ ucfirst($status) }}

New vital signs have been recorded for this resident.

@endif
@if($notes)
Notes: {{ $notes }}
@endif

Thank you,
{{ config('mail.from.name') }}

