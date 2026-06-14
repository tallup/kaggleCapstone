Medication Delivery Received

Resident: {{ $residentName }}
Medication: {{ $medicationName }}
Received By: {{ $receivedByName }}
Delivery Date: {{ $deliveryDate }}
@if($quantity)
Quantity: {{ $quantity }}
@endif
@if($supplier)
Supplier: {{ $supplier }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A medication delivery has been received and recorded.

Thank you,
{{ config('mail.from.name') }}

