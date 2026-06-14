# Email System - How and When Emails Are Sent and Delivered

## Overview

The application uses a multi-layered email system that sends emails through:
1. **Scheduled Commands** (automated, time-based)
2. **Event Observers** (triggered by database changes)
3. **Direct API Calls** (user actions)

All emails respect user preferences and facility-specific configurations.

---

## 📧 Email Delivery Methods

### 1. **Synchronous Delivery** (Default)
- Emails are sent **immediately** when triggered
- Uses Laravel's `Mail::send()` method
- No queue system by default (can be configured)

### 2. **Queue System** (Optional)
- Configured via `QUEUE_CONNECTION` in `.env`
- Default: `database` (emails stored in `jobs` table)
- Alternative: `redis`, `sqs`, `beanstalkd`
- Requires queue worker: `php artisan queue:work`

---

## ⏰ Scheduled Email Commands

These commands run automatically via Laravel Scheduler (configured in `routes/console.php`):

### 1. **Medication Window Opening Notifications**
- **Command**: `medications:notify-window-opening`
- **Frequency**: Every 5 minutes
- **When**: 5 minutes before a medication administration window opens
- **Recipients**: 
  - Caregivers assigned to the medication's branch
  - Facility-level admins (`super_admin`, `administrator`)
  - Branch-level admins (`admin`)
- **Email**: `MedicationWindowOpeningNotification`
- **Content**: Medication name, resident, scheduled time, window start/end times

### 2. **Notification Generation** (In-App + Email Hooks)
- **Command**: `notifications:generate`
- **Frequency**: Every hour
- **Purpose**: Creates in-app notifications for:
  - Appointments in next 7 days
  - Medications due today
- **Email**: Not directly sent, but can trigger email notifications

### 3. **Reminder Dispatch**
- **Command**: `reminders:dispatch`
- **Frequency**: Every 5 minutes
- **Purpose**: Dispatches due reminders as in-app notifications
- **Email**: Can be extended to send emails

---

## 🎯 Event-Driven Emails (Observers)

These emails are sent **immediately** when specific database events occur:

### 1. **Fire Drill Scheduled**
- **Trigger**: When a fire drill is created with status `scheduled`
- **Observer**: `FireDrillObserver::created()`
- **Recipients**: All staff in the branch + admins
- **Email**: `FireDrillNotification`
- **Service Method**: `NotificationService::sendFireDrillEmail()`

### 2. **Assessment Created/Updated**
- **Trigger**: When an assessment is created or status changes to `completed`/`approved`
- **Observer**: `AssessmentObserver`
- **Recipients**: Facility admins
- **Email**: `AssessmentNotification`
- **Service Method**: `NotificationService::sendAssessmentEmail()`

### 3. **Expense Created/Updated**
- **Trigger**: When an expense is created or payment status changes
- **Observer**: `ExpenseObserver`
- **Recipients**: Facility admins
- **Email**: `ExpenseNotification`
- **Service Method**: `NotificationService::sendExpenseEmail()`

### 4. **Expense Category Created/Updated**
- **Trigger**: When an expense category is created or updated
- **Observer**: `ExpenseCategoryObserver`
- **Recipients**: Facility admins
- **Email**: `ExpenseCategoryNotification`
- **Service Method**: `NotificationService::sendExpenseCategoryEmail()`

### 5. **Pharmacy Supplier Created/Updated**
- **Trigger**: When a pharmacy supplier is created or updated
- **Observer**: `PharmacySupplierObserver`
- **Recipients**: Facility admins
- **Email**: `PharmacySupplierNotification`
- **Service Method**: `NotificationService::sendPharmacySupplierEmail()`

### 6. **Pharmacy Order Created/Updated**
- **Trigger**: When a pharmacy order is created or status changes
- **Observer**: `PharmacyOrderObserver`
- **Recipients**: Facility admins
- **Email**: `PharmacyOrderNotification`
- **Service Method**: `NotificationService::sendPharmacyOrderEmail()`

### 7. **Medication Delivery Created/Updated**
- **Trigger**: When a medication delivery is created or status changes
- **Observer**: `MedicationDeliveryObserver` (if exists)
- **Recipients**: Caregivers/admins
- **Email**: `MedicationDeliveryNotification`
- **Service Method**: `NotificationService::sendMedicationDeliveryEmail()`

### 8. **Leave Request Created/Updated**
- **Trigger**: When a leave request is created or status changes
- **Observer**: `LeaveRequestObserver`
- **Recipients**: Admins/managers
- **Email**: `LeaveRequestNotification`
- **Service Method**: `NotificationService::sendLeaveRequestEmail()`

### 9. **Vital Sign Critical Values**
- **Trigger**: When a vital sign is recorded with critical values
- **Observer**: `VitalSignObserver`
- **Recipients**: Caregivers assigned to resident
- **Email**: `VitalSignNotification`
- **Service Method**: `NotificationService::sendVitalSignEmail()`

### 10. **Incident Created**
- **Trigger**: When an incident is created
- **Observer**: `IncidentObserver` (if exists)
- **Recipients**: Admins, caregivers
- **Email**: `IncidentNotification`
- **Service Method**: `NotificationService::sendIncidentEmail()`

### 11. **Resident Sign Out**
- **Trigger**: When a resident signs out
- **Observer**: `ResidentSignOutObserver` (if exists)
- **Recipients**: Caregivers, admins
- **Email**: `ResidentSignOutNotification`
- **Service Method**: `NotificationService::sendResidentSignOutEmail()`

### 12. **Visitor Created**
- **Trigger**: When a visitor is registered
- **Observer**: `VisitorObserver` (if exists)
- **Recipients**: Caregivers, admins
- **Email**: `VisitorNotification`
- **Service Method**: `NotificationService::sendVisitorEmail()`

### 13. **Sleep Record Created**
- **Trigger**: When a sleep record is created
- **Observer**: `SleepRecordObserver` (if exists)
- **Recipients**: Caregivers, admins
- **Email**: `SleepRecordNotification`
- **Service Method**: `NotificationService::sendSleepRecordEmail()`

### 14. **Staff Clock In**
- **Trigger**: When staff clocks in
- **Observer**: `StaffClockInObserver` (if exists)
- **Recipients**: Admins
- **Email**: `StaffClockInNotification`
- **Service Method**: `NotificationService::sendStaffClockInEmail()`

### 15. **Grocery Status Update**
- **Trigger**: When grocery status is updated
- **Observer**: `GroceryStatusUpdateObserver`
- **Recipients**: Admins
- **Email**: `GroceryStatusNotification`
- **Service Method**: `NotificationService::sendGroceryStatusEmail()`

---

## 🔧 Email Configuration System

### Facility-Level Configuration
Each facility can configure:
- **Mail Driver**: `ses`, `ses-v2`, `smtp`, `sendmail`, `log`, `mailgun`, `postmark`
- **From Address**: Custom sender email
- **From Name**: Custom sender name
- **SES Region**: AWS region override (for SES)
- **SES Configuration Set**: AWS SES configuration set

**Service**: `MailConfigurationService::configureForFacility()`

### User Email Preferences
Users can opt-in/opt-out of specific email types:
- `late_medication_enabled`
- `late_vital_sign_enabled`
- `appointment_reminder_enabled`
- `incident_alert_enabled`
- `resident_sign_out_enabled`
- `medication_administration_enabled`
- `medication_window_opening_enabled`
- `critical_vital_sign_enabled`
- `daily_summary_enabled`
- `task_assignment_enabled`

**Service**: `EmailPreferenceService::shouldSendEmail()`

**Priority**:
1. User-specific preferences (if set)
2. Facility-level defaults (if set)
3. System defaults (all enabled)

---

## 📬 Email Delivery Flow

```
1. Event/Observer Triggered
   ↓
2. NotificationService Method Called
   ↓
3. MailConfigurationService Configures Facility Settings
   ↓
4. EmailPreferenceService Filters Recipients
   ↓
5. EmailRecipientService Checks Notification Config
   ↓
6. Mail::to()->send() Called
   ↓
7. Email Sent via Configured Driver (SES/SMTP/etc.)
   ↓
8. Success/Error Logged
```

---

## 📋 Complete Email Types

### Medication-Related
- `MedicationWindowOpeningNotification` - Window opening (scheduled)
- `LateMedicationNotification` - Medication overdue
- `MedicationAdministrationNotification` - Administration recorded
- `MedicationDeliveryNotification` - Delivery received
- `MedicationNotification` - General medication alerts

### Appointment & Assessment
- `AppointmentNotification` - Appointment reminders/updates
- `AssessmentNotification` - Assessment created/completed

### Vital Signs & Health
- `VitalSignNotification` - Critical vital signs
- `LateVitalSignNotification` - Overdue vital signs

### Safety & Compliance
- `FireDrillNotification` - Fire drill scheduled
- `IncidentNotification` - Incident reported

### Administrative
- `LeaveRequestNotification` - Leave request status
- `ExpenseNotification` - Expense created/updated
- `ExpenseCategoryNotification` - Category created/updated
- `PharmacyOrderNotification` - Order status
- `PharmacySupplierNotification` - Supplier created/updated
- `GroceryStatusNotification` - Grocery status update

### Resident Management
- `ResidentSignOutNotification` - Resident signed out
- `VisitorNotification` - Visitor registered
- `SleepRecordNotification` - Sleep record created

### Staff Management
- `StaffClockInNotification` - Staff clocked in
- `EmployeeDocumentNotification` - Document uploaded
- `TaskAssignmentNotification` - Task assigned

---

## ⚙️ Configuration Files

### Mail Configuration
- **File**: `config/mail.php`
- **Default Driver**: `env('MAIL_MAILER', 'log')`
- **Supported Drivers**: `smtp`, `ses`, `ses-v2`, `sendmail`, `mailgun`, `postmark`, `log`, `array`

### Queue Configuration
- **File**: `config/queue.php`
- **Default**: `env('QUEUE_CONNECTION', 'database')`
- **Options**: `database`, `redis`, `sqs`, `beanstalkd`

### Scheduler Configuration
- **File**: `routes/console.php`
- **Cron Required**: `* * * * * php artisan schedule:run`

---

## 🔍 Monitoring & Logging

All email sends are logged:
- **Success**: `Log::info('Email sent', [...])`
- **Failure**: `Log::error('Failed to send email', [...])`

Logs include:
- Recipient email
- Email type
- Facility ID
- Medication/Resident/Event ID
- Error messages (if failed)

---

## 🚀 Production Setup

### Required Cron Job
```bash
* * * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1
```

### Queue Worker (if using queues)
```bash
php artisan queue:work --daemon
```

### Email Driver Setup
1. Configure AWS SES credentials in `.env`
2. Or configure SMTP settings
3. Set facility-specific settings in admin panel

---

## 📊 Email Delivery Summary

| Email Type | Trigger | Frequency | Recipients |
|------------|---------|-----------|------------|
| Medication Window Opening | Scheduled | Every 5 min | Caregivers + Admins |
| Fire Drill | Event | Immediate | Branch Staff + Admins |
| Assessment | Event | Immediate | Facility Admins |
| Expense | Event | Immediate | Facility Admins |
| Late Medication | Event | Immediate | Caregivers |
| Critical Vital Sign | Event | Immediate | Caregivers |
| Leave Request | Event | Immediate | Admins |
| Pharmacy Order | Event | Immediate | Facility Admins |

---

## ✅ Email Preference Checks

Before sending, the system checks:
1. ✅ User has email address
2. ✅ User is active
3. ✅ User has email preference enabled for this type
4. ✅ Facility has notification enabled (if config exists)
5. ✅ Mail configuration is valid

If any check fails, email is **not sent** (but may still create in-app notification).

---

## 🔐 Security & Privacy

- Emails respect facility boundaries
- Only users with proper access receive emails
- Email preferences are user-specific
- Facility-level email configuration is isolated
- All email sends are logged for audit purposes
