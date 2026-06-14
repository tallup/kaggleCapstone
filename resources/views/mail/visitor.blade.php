@if($eventType === 'checked_in')
Visitor Checked In

Visitor: {{ $visitorName }}
Visiting: {{ $residentName }}
Relationship: {{ $relationship }}
Check In Time: {{ $checkInTime }}
@if($purpose)
Purpose: {{ $purpose }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A visitor has checked in to the facility.

@elseif($eventType === 'checked_out')
Visitor Checked Out

Visitor: {{ $visitorName }}
Check Out Time: {{ $checkOutTime }}
@if($checkInTime)
Check In Time: {{ $checkInTime }}
@endif

A visitor has checked out from the facility.

@endif

Thank you,
{{ config('mail.from.name') }}

