@if($eventType === 'created')
New Leave Request

Staff Member: {{ $staffName }}
Start Date: {{ $startDate }}
End Date: {{ $endDate }}
Duration: {{ $duration }} days
@if($reason)
Reason: {{ $reason }}
@endif

Please review and approve or decline this leave request.

@elseif($eventType === 'approved')
Leave Request Approved

Your leave request has been approved by {{ $approvedByName }}.

Start Date: {{ $startDate }}
End Date: {{ $endDate }}
Duration: {{ $duration }} days

@elseif($eventType === 'declined')
Leave Request Declined

Your leave request has been declined by {{ $approvedByName }}.

Start Date: {{ $startDate }}
End Date: {{ $endDate }}
Duration: {{ $duration }} days

@endif

Thank you,
{{ config('mail.from.name') }}

