@if($eventType === 'created')
New Pharmacy Order Created

Order Number: {{ $orderNumber }}
Supplier: {{ $supplierName }}
Branch: {{ $branchName }}
Total Amount: ${{ $total }}
Order Date: {{ $orderDate }}
@if($expectedDeliveryDate)
Expected Delivery: {{ $expectedDeliveryDate }}
@endif

A new pharmacy order has been created. Please review and confirm.

@elseif($eventType === 'status_changed')
Pharmacy Order Status Updated

Order Number: {{ $orderNumber }}
Supplier: {{ $supplierName }}
New Status: {{ $status }}

The status of this pharmacy order has been updated.

@endif

Thank you,
{{ config('mail.from.name') }}

