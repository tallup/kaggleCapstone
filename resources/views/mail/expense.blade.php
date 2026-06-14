@if($eventType === 'created')
New Expense Created

Description: {{ $description }}
Amount: ${{ $amount }}
Category: {{ $categoryName }}
@if($branchName)
Branch: {{ $branchName }}
@endif
Date: {{ $expenseDate }}
@if($createdByName)
Created By: {{ $createdByName }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A new expense has been created and requires review.

@elseif($eventType === 'paid')
Expense Marked as Paid

Description: {{ $description }}
Amount: ${{ $amount }}
Category: {{ $categoryName }}
@if($branchName)
Branch: {{ $branchName }}
@endif
@if($paymentDate)
Payment Date: {{ $paymentDate }}
@endif
@if($paymentMethod)
Payment Method: {{ $paymentMethod }}
@endif
@if($expenseDate)
Expense Date: {{ $expenseDate }}
@endif
@if($createdByName)
Created By: {{ $createdByName }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

This expense has been marked as paid and payment has been recorded.

@elseif($eventType === 'deleted')
Expense Deleted

Description: {{ $description }}
Amount: ${{ $amount }}
Category: {{ $categoryName }}
@if($branchName)
Branch: {{ $branchName }}
@endif

This expense has been deleted from the system.

@endif

Thank you,
{{ config('mail.from.name') }}


Description: {{ $description }}
Amount: ${{ $amount }}
Category: {{ $categoryName }}
@if($branchName)
Branch: {{ $branchName }}
@endif

This expense has been deleted from the system.

@endif

Thank you,
{{ config('mail.from.name') }}

