Hello,

A housekeeping task has been completed:

Task: {{ $taskTitle }}
Area: {{ $areaName }}
Scheduled Date: {{ $scheduledDate }}
Completed By: {{ $completedByName }}
Completion Time: {{ $completedAt }}

@if($notes)
Notes:
{{ $notes }}
@endif

Log in to the system to view full details.

Thank you,
{{ config('mail.from.name') }}
