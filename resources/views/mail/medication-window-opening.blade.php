Medication Administration Window Opening

Medication: {{ $medicationName }}
Resident: {{ $residentName }}
Scheduled Time: {{ $scheduledTime }}
Window Opens: {{ $windowStartTime }}
Window Closes: {{ $windowEndTime }}

The administration window for this medication is opening soon. Please prepare to administer the medication within the window.

Dosage: {{ $dosage }}
Instructions: {{ $instructions ?? 'Not specified' }}

Please ensure the medication is administered between {{ $windowStartTime }} and {{ $windowEndTime }}.

