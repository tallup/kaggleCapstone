Grocery Status Updated

Item: {{ $itemName }}
Status: {{ $status }}
Updated By: {{ $updatedByName }}
Date: {{ $updateDate }}
@if($quantity)
Quantity: {{ $quantity }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

The grocery status has been updated.

Thank you,
{{ config('mail.from.name') }}

