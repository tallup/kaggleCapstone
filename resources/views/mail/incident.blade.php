@if($eventType === 'reported')
New Incident Reported

Incident Number: {{ $incidentNumber }}
Type: {{ $incidentType }}
Resident: {{ $residentName }}
Reported By: {{ $reportedByName }}
Date: {{ $incidentDate }}
@if($location)
Location: {{ $location }}
@endif
Severity: {{ ucfirst($severity) }}
Priority: {{ ucfirst($priority) }}
Status: {{ ucfirst($status) }}

@if($description)
Description:
{{ $description }}
@endif

Please review and take appropriate action.

@elseif($eventType === 'assigned')
Incident Assigned to You

Incident Number: {{ $incidentNumber }}
Type: {{ $incidentType }}
Resident: {{ $residentName }}
Severity: {{ ucfirst($severity) }}
Priority: {{ ucfirst($priority) }}

You have been assigned to handle this incident. Please review and take appropriate action.

@elseif($eventType === 'resolved')
Incident Resolved

Incident Number: {{ $incidentNumber }}
Type: {{ $incidentType }}
Resident: {{ $residentName }}

This incident has been marked as resolved.

@elseif($eventType === 'closed')
Incident Closed

Incident Number: {{ $incidentNumber }}
Type: {{ $incidentType }}
Resident: {{ $residentName }}

This incident has been closed.

@elseif($eventType === 'escalated')
CRITICAL: Incident Escalated

Incident Number: {{ $incidentNumber }}
Type: {{ $incidentType }}
Resident: {{ $residentName }}

This incident has been escalated to CRITICAL priority/severity. Immediate attention required.

@endif

Thank you,
{{ config('mail.from.name') }}

