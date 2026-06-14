@if($eventType === 'created')
New Expense Category Created

Category Name: {{ $categoryName }}
Type: {{ $categoryType }}
@if($description)
Description: {{ $description }}
@endif

A new expense category has been created.

@elseif($eventType === 'updated')
Expense Category Updated

Category Name: {{ $categoryName }}
Type: {{ $categoryType }}
@if($description)
Description: {{ $description }}
@endif

This expense category has been updated.

@elseif($eventType === 'deleted')
Expense Category Deleted

Category Name: {{ $categoryName }}

This expense category has been deleted from the system.

@endif

Thank you,
{{ config('mail.from.name') }}

