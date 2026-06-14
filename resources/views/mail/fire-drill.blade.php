Fire Drill Scheduled

Branch: {{ $branchName }}
Date: {{ $drillDate }}
Time: {{ $drillTime }}
@if($drillType)
Drill Type: {{ ucfirst($drillType) }}
@endif
Status: {{ ucfirst($status) }}
@if($createdByName)
Scheduled By: {{ $createdByName }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A fire drill has been scheduled. Please ensure all staff are aware and prepared.

Thank you,
{{ config('mail.from.name') }}

