# Staff Email Notification Preferences System

## Overview

This system allows staff members across multiple facilities to control which email notifications they receive. Each staff member can customize their email preferences, and facilities can set default preferences for all staff.

## Features

- **Per-User Preferences**: Each staff member can customize their email notification settings
- **Facility Defaults**: Facilities can set default preferences that apply to all staff (unless overridden)
- **Notification Types**: Control preferences for:
  - Late medication alerts
  - Late vital sign alerts
  - Appointment reminders
  - Incident alerts
  - Resident sign-out notifications
  - Medication administration notifications
  - Critical vital sign alerts
  - Daily summary emails
- **Master Toggle**: Global email on/off switch
- **Frequency Options**: Immediate, daily digest, or weekly digest (future feature)

## Database Structure

### Migration

Run the migration to create the `staff_email_preferences` table:

```bash
php artisan migrate
```

### Table Structure

- `facility_id`: The facility this preference belongs to
- `user_id`: The user (null for facility defaults)
- `late_medication_enabled`: Receive emails for late medications
- `late_vital_sign_enabled`: Receive emails for late vital signs
- `appointment_reminder_enabled`: Receive emails for appointment reminders
- `incident_alert_enabled`: Receive emails for incident alerts
- `resident_sign_out_enabled`: Receive emails for resident sign-outs
- `medication_administration_enabled`: Receive emails for medication administrations
- `critical_vital_sign_enabled`: Receive emails for critical vital signs
- `daily_summary_enabled`: Receive daily summary emails
- `email_enabled`: Master toggle for all email notifications
- `frequency`: Notification frequency (immediate, daily_digest, weekly_digest)
- `digest_time`: Time to send digest emails

## How It Works

### Preference Hierarchy

1. **User-Specific Preferences**: If a user has set their own preferences, those are used
2. **Facility Defaults**: If no user preferences exist, facility defaults are used
3. **System Defaults**: If neither exist, system defaults (all enabled) are used

### Automatic Filtering

The `NotificationService` now automatically filters recipients based on their email preferences before sending emails. Staff who have disabled specific notification types will not receive those emails.

## API Endpoints

### Get User's Email Preferences

```http
GET /api/v1/staff-email-preferences?user_id={optional}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "facility_id": 1,
    "user_id": 5,
    "late_medication_enabled": true,
    "late_vital_sign_enabled": true,
    "appointment_reminder_enabled": false,
    "incident_alert_enabled": true,
    "resident_sign_out_enabled": true,
    "medication_administration_enabled": true,
    "critical_vital_sign_enabled": true,
    "daily_summary_enabled": false,
    "email_enabled": true,
    "frequency": "immediate",
    "digest_time": null
  }
}
```

### Update/Create User Preferences

```http
POST /api/v1/staff-email-preferences
Content-Type: application/json

{
  "late_medication_enabled": true,
  "late_vital_sign_enabled": false,
  "appointment_reminder_enabled": true,
  "incident_alert_enabled": true,
  "resident_sign_out_enabled": true,
  "medication_administration_enabled": true,
  "critical_vital_sign_enabled": true,
  "daily_summary_enabled": false,
  "email_enabled": true,
  "frequency": "immediate",
  "user_id": 5  // Optional, defaults to current user
}
```

### Get Facility Defaults

```http
GET /api/v1/staff-email-preferences/facility-defaults
```

**Note:** Only admins can view facility defaults.

### Update Facility Defaults

```http
POST /api/v1/staff-email-preferences/facility-defaults
Content-Type: application/json

{
  "late_medication_enabled": true,
  "late_vital_sign_enabled": true,
  "appointment_reminder_enabled": true,
  "incident_alert_enabled": true,
  "resident_sign_out_enabled": true,
  "medication_administration_enabled": true,
  "critical_vital_sign_enabled": true,
  "daily_summary_enabled": false,
  "email_enabled": true,
  "frequency": "immediate",
  "digest_time": "08:00"
}
```

**Note:** Only admins can update facility defaults.

## Usage in Code

### Checking if User Should Receive Email

```php
use App\Services\EmailPreferenceService;

$emailPreferenceService = app(EmailPreferenceService::class);

// Check if a user should receive a specific notification type
$shouldSend = $emailPreferenceService->shouldSendEmail(
    $user,
    'late_medication',  // notification type
    $facility  // optional
);

if ($shouldSend) {
    // Send email
}
```

### Filtering Users Before Sending

```php
use App\Services\EmailPreferenceService;

$emailPreferenceService = app(EmailPreferenceService::class);

// Filter users who should receive emails
$usersToNotify = $emailPreferenceService->filterUsersForEmail(
    $caregivers,  // Collection of users
    'late_medication',  // notification type
    $facility  // optional
);

foreach ($usersToNotify as $user) {
    Mail::to($user->email)->send($mailable);
}
```

## Notification Types

The following notification types are supported:

- `late_medication` - Late medication alerts
- `late_vital_sign` - Late vital sign alerts
- `appointment_reminder` - Appointment reminders
- `incident_alert` - Incident alerts
- `resident_sign_out` - Resident sign-out notifications
- `medication_administration` - Medication administration notifications
- `critical_vital_sign` - Critical vital sign alerts
- `daily_summary` - Daily summary emails

## Default Behavior

- **All notifications are enabled by default** for new users
- If a user has no preferences set, facility defaults are used
- If no facility defaults exist, system defaults (all enabled) are used
- The `NotificationService` automatically respects preferences when sending emails

## Security

- Users can only view/update their own preferences (unless they're admins)
- Only admins can view/update facility defaults
- All endpoints require authentication (`auth:sanctum`)

## Integration

The system is already integrated with:
- `NotificationService` - Automatically filters recipients
- Late medication notifications
- Late vital sign notifications

Future integrations can be added by:
1. Using `EmailPreferenceService` to check preferences
2. Using the appropriate notification type string
3. Filtering users before sending emails

## Testing

To test the system:

1. **Set up preferences for a user:**
```bash
# Via API or directly in database
```

2. **Send a test notification:**
```bash
# The NotificationService will automatically respect preferences
```

3. **Verify the user receives/doesn't receive emails based on their preferences**

## Migration

After running the migration, existing staff will use system defaults (all enabled) until they set their preferences.

