@if($eventType === 'uploaded')
Employee Document Added

Document: {{ $documentName }}
Staff Member: {{ $staffName }}
Document Type: {{ $documentType }}
@if($expiryDate)
Expiry Date: {{ $expiryDate }}
@endif
@if($uploadedByName)
Uploaded By: {{ $uploadedByName }}
@endif
@if($notes)
Notes: {{ $notes }}
@endif

A new employee document has been uploaded.

@elseif($eventType === 'expiring')
Document Expiring Soon

Document: {{ $documentName }}
Staff Member: {{ $staffName }}
Document Type: {{ $documentType }}
Expiry Date: {{ $expiryDate }}

This document is expiring soon. Please review and renew if necessary.

@elseif($eventType === 'expired')
Document Expired

Document: {{ $documentName }}
Staff Member: {{ $staffName }}
Document Type: {{ $documentType }}
Expiry Date: {{ $expiryDate }}

This document has expired. Please renew immediately.

@endif

Thank you,
{{ config('mail.from.name') }}

