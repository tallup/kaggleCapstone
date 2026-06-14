Hello {{ $contactName }},

You have been invited to access the Family Portal for {{ $residentName }} at {{ $facilityName }}.

Use the link below to sign up and view care updates and messages:

{{ $inviteLink }}

This link will expire in 7 days. If you did not expect this invite, you can ignore this email.

Best regards,
{{ config('mail.from.name') }}
