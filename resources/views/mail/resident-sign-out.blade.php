@if($eventType === 'signed_out')
Resident Signed Out

Resident: {{ $residentName }}
Signed Out By: {{ $signedOutByName }}
Sign Out Time: {{ $signOutDate }}
Destination: {{ $destination }}
@if($accompaniedBy)
Accompanied By: {{ $accompaniedBy }}
@endif
@if($expectedReturnTime)
Expected Return: {{ $expectedReturnTime }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A resident has signed out from the facility.

@elseif($eventType === 'returned')
Resident Returned

Resident: {{ $residentName }}
Return Time: {{ $returnDate }}
@if($signOutDate)
Original Sign Out Time: {{ $signOutDate }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A resident has returned to the facility.

@endif

Thank you,
{{ config('mail.from.name') }}

