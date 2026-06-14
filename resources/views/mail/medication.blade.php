New Medication Added

Medication: {{ $medicationName }}
Resident: {{ $residentName }}
Dosage: {{ $dosage }}
Frequency: {{ $frequency }}
Route: {{ $route }}
@if($startDate)
Start Date: {{ $startDate }}
@endif
@if($endDate)
End Date: {{ $endDate }}
@endif
@if($instructions)
Instructions: {{ $instructions }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif
Created By: {{ $createdBy }}

A new medication has been added for this resident. Please review the details and ensure proper administration.

Thank you,
{{ config('mail.from.name') }}

