Medication Administered

Medication: {{ $medicationName }}
Resident: {{ $residentName }}
Administered By: {{ $administeredByName }}
Date & Time: {{ $administeredAt }}
@if($dosageGiven)
Dosage: {{ $dosageGiven }}
@endif
Status: {{ ucfirst($status) }}
@if($notes)
Notes: {{ $notes }}
@endif

This medication has been successfully administered.

Thank you,
{{ config('mail.from.name') }}

