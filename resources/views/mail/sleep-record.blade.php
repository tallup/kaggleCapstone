Sleep Record Added

Resident: {{ $residentName }}
Recorded By: {{ $createdByName }}
Date: {{ $sleepDate }}
Total Hours: {{ $totalHours }} hours
@if($bedtime)
Bedtime: {{ $bedtime }}
@endif
@if($wakeTime)
Wake Time: {{ $wakeTime }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A new sleep record has been added for this resident.

Thank you,
{{ config('mail.from.name') }}

