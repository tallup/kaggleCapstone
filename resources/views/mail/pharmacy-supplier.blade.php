@if($eventType === 'created')
New Pharmacy Supplier Added

Supplier Name: {{ $supplierName }}
@if($contactName)
Contact: {{ $contactName }}
@endif
@if($email)
Email: {{ $email }}
@endif
@if($phone)
Phone: {{ $phone }}
@endif
@if($address)
Address: {{ $address }}
@endif

A new pharmacy supplier has been added to the system.

@elseif($eventType === 'updated')
Pharmacy Supplier Updated

Supplier Name: {{ $supplierName }}

This pharmacy supplier's information has been updated.

@endif

Thank you,
{{ config('mail.from.name') }}

