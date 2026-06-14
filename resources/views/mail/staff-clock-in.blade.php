@if($eventType === 'clocked_in')
Staff Clocked In

Staff Member: {{ $staffName }}
Branch: {{ $branchName }}
Clock In Time: {{ $clockInTime }}
@if($notes)
Notes: {{ $notes }}
@endif

A staff member has clocked in.

@elseif($eventType === 'clocked_out')
Staff Clocked Out

Staff Member: {{ $staffName }}
Branch: {{ $branchName }}
Clock Out Time: {{ $clockOutTime }}
@if($clockInTime)
Clock In Time: {{ $clockInTime }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A staff member has clocked out.

@endif

Thank you,
{{ config('mail.from.name') }}

