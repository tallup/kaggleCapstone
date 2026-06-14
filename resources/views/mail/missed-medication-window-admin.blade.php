Missed medication — administration window closed

Medication: {{ $medicationName }}
Resident: {{ $residentName }}
Scheduled time: {{ $scheduledTime }} on {{ $scheduledDate }}
Administration window closed at: {{ $windowEndFormatted }}

The scheduled dose was not administered before the window closed. A missed administration record has been created in the system.

Dosage: {{ $dosage }}
Instructions: {{ $instructions ?? 'Not specified' }}
