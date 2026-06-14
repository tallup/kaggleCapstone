<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AppointmentReportController;
use App\Http\Controllers\Api\AssessmentController;
use App\Http\Controllers\Api\AssessmentQuestionController;
use App\Http\Controllers\Api\AssessmentSummaryReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BehaviorDataController;
use App\Http\Controllers\Api\BillingInvoiceController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\Api\CleaningAreaController;
use App\Http\Controllers\Api\CleaningChecklistController;
use App\Http\Controllers\Api\CleaningTaskAssignmentController;
use App\Http\Controllers\Api\CleaningTaskController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DatabaseManagementController;
use App\Http\Controllers\Api\DocumentLibraryController;
use App\Http\Controllers\Api\DrugController;
use App\Http\Controllers\Api\EmailNotificationConfigController;
use App\Http\Controllers\Api\EmailTemplateController;
use App\Http\Controllers\Api\EmployeeDocumentController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExpenseReportController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\FacilitySettingsController;
use App\Http\Controllers\Api\FaxContactController;
use App\Http\Controllers\Api\FaxController;
use App\Http\Controllers\Api\FaxNumberController;
use App\Http\Controllers\Api\FaxSettingsController;
use App\Http\Controllers\Api\GeocodingController;
use App\Http\Controllers\Api\HousekeepingReportController;
use App\Http\Controllers\Api\IncidentHistoryReportController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\MedicationAdministrationController;
use App\Http\Controllers\Api\MedicationController;
use App\Http\Controllers\Api\MedicationDashboardController;
use App\Http\Controllers\Api\MedicationLogReportController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PaymentNotificationPreferenceController;
use App\Http\Controllers\Api\PublicContactController;
use App\Http\Controllers\Api\PublicStaffClockInController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\ReminderEventController;
use App\Http\Controllers\Api\ResidentChartController;
use App\Http\Controllers\Api\ResidentController;
use App\Http\Controllers\Api\ResidentSignOutController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaasBillingController;
use App\Http\Controllers\Api\SleepLogReportController;
use App\Http\Controllers\Api\SleepRecordController;
use App\Http\Controllers\Api\StaffClockInController;
use App\Http\Controllers\Api\StaffEmailPreferenceController;
use App\Http\Controllers\Api\SystemSettingsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VisitorController;
use App\Http\Controllers\Api\VitalRangeController;
use App\Http\Controllers\Api\VitalSignController;
use App\Http\Controllers\Api\VitalsLogReportController;
use App\Http\Controllers\Webhook\DocumoFaxWebhookController;
use App\Http\Controllers\Webhook\FakeFaxWebhookController;
use App\Http\Controllers\Webhook\TelnyxFaxWebhookController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;

// Public routes (no authentication required)
Route::prefix('public')->group(function () {
    // Contact form - delivers to support@homelogic360.com via AWS SES
    Route::post('/contact', [PublicContactController::class, 'submit'])->middleware('throttle:10,1');

    // Public staff clock-in endpoints
    Route::prefix('staff')->middleware('throttle:30,1')->group(function () {
        Route::post('/verify-employee', [PublicStaffClockInController::class, 'verifyEmployee']);
        Route::post('/clock-in', [PublicStaffClockInController::class, 'clockIn']);
        Route::post('/clock-out', [PublicStaffClockInController::class, 'clockOut']);
    });
});

Route::prefix('v1')->middleware([\App\Http\Middleware\SetFacilityContext::class])->group(function () {
    // Auth routes - login needs session support for Filament redirects
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware([
            'throttle:5,1',
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
        ])->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])
        ->middleware('throttle:3,1')
        ->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:5,1')
        ->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        'auth:sanctum',
    ])->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
    Route::get('/user', [AuthController::class, 'user'])
        ->middleware('auth:sanctum')
        ->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
    Route::put('/user/password', [AuthController::class, 'changePassword'])->middleware('auth:sanctum');
    Route::put('/user/credentials', [AuthController::class, 'updateCredentials'])->middleware('auth:sanctum');
    Route::post('/token/refresh', [AuthController::class, 'refreshToken'])->middleware(['auth:sanctum', 'throttle:10,1']);
    Route::post('/token/validate', [AuthController::class, 'validateToken'])->middleware(['auth:sanctum', 'throttle:30,1']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats'])->middleware('auth:sanctum');
    Route::get('/dashboard/resident-vitals/{residentId}', [DashboardController::class, 'residentVitalsTrend'])->middleware('auth:sanctum');
    Route::get('/dashboard/daily-activities', [DashboardController::class, 'dailyActivities'])->middleware('auth:sanctum');
    Route::get('/dashboard/upcoming-events', [DashboardController::class, 'upcomingEvents'])->middleware('auth:sanctum');
    Route::get('/dashboard/todays-schedule', [DashboardController::class, 'todaysSchedule'])->middleware('auth:sanctum');

    // SaaS subscription (Stripe) — Cashier billable is Facility
    Route::get('/saas-billing', [SaasBillingController::class, 'show'])->middleware('auth:sanctum');
    Route::post('/saas-billing/portal', [SaasBillingController::class, 'portal'])->middleware(['auth:sanctum', 'throttle:10,1']);

    // Facility + resident document library (nested folders)
    Route::prefix('document-library')->middleware('auth:sanctum')->group(function () {
        Route::get('/tree', [DocumentLibraryController::class, 'tree']);
        Route::post('/folders', [DocumentLibraryController::class, 'storeFolder']);
        Route::patch('/folders/{id}', [DocumentLibraryController::class, 'updateFolder'])->whereNumber('id');
        Route::delete('/folders/{id}', [DocumentLibraryController::class, 'destroyFolder'])->whereNumber('id');
        Route::post('/files', [DocumentLibraryController::class, 'storeFile']);
        Route::get('/files/{id}/download', [DocumentLibraryController::class, 'download'])->whereNumber('id');
        Route::delete('/files/{id}', [DocumentLibraryController::class, 'destroyFile'])->whereNumber('id');
    });

    // Residents
    Route::get('/residents/{resident}/reports/medication-log', MedicationLogReportController::class)->middleware('auth:sanctum');
    Route::get('/residents/{resident}/reports/vitals-log', VitalsLogReportController::class)->middleware('auth:sanctum');
    Route::get('/residents/{resident}/reports/sleep-log', SleepLogReportController::class)->middleware('auth:sanctum');
    Route::get('/residents/{resident}/reports/appointments', AppointmentReportController::class)->middleware('auth:sanctum');
    Route::get('/residents/{resident}/reports/incidents', IncidentHistoryReportController::class)->middleware('auth:sanctum');
    Route::get('/residents/{resident}/reports/assessments', AssessmentSummaryReportController::class)->middleware('auth:sanctum');
    Route::post('/residents/{resident}/status', [ResidentController::class, 'updateStatus'])->middleware('auth:sanctum');
    Route::apiResource('residents', ResidentController::class)->middleware('auth:sanctum');
    Route::get('/residents/{id}/appointments', [ResidentController::class, 'appointments'])->middleware('auth:sanctum');
    Route::get('/residents/{id}/vitals', [ResidentController::class, 'vitals'])->middleware('auth:sanctum');

    // Resident contacts (family portal invites) - staff only
    Route::get('/resident-contacts', [\App\Http\Controllers\Api\ResidentContactController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/resident-contacts', [\App\Http\Controllers\Api\ResidentContactController::class, 'store'])->middleware('auth:sanctum');
    Route::get('/resident-contacts/{id}', [\App\Http\Controllers\Api\ResidentContactController::class, 'show'])->middleware('auth:sanctum');
    Route::put('/resident-contacts/{id}', [\App\Http\Controllers\Api\ResidentContactController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/resident-contacts/{id}', [\App\Http\Controllers\Api\ResidentContactController::class, 'destroy'])->middleware('auth:sanctum');
    Route::post('/resident-contacts/{id}/send-invite', [\App\Http\Controllers\Api\ResidentContactController::class, 'sendInvite'])->middleware('auth:sanctum');

    // Family portal - family users only
    Route::get('/family/residents', [\App\Http\Controllers\Api\FamilyController::class, 'residents'])->middleware('auth:sanctum');
    Route::get('/family/care-updates', [\App\Http\Controllers\Api\FamilyController::class, 'careUpdates'])->middleware('auth:sanctum');
    Route::get('/family/messages/threads', [\App\Http\Controllers\Api\FamilyMessageController::class, 'threads'])->middleware('auth:sanctum');
    Route::get('/family/messages', [\App\Http\Controllers\Api\FamilyMessageController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/family/messages', [\App\Http\Controllers\Api\FamilyMessageController::class, 'store'])->middleware('auth:sanctum');
    Route::post('/family/messages/{id}/mark-read', [\App\Http\Controllers\Api\FamilyMessageController::class, 'markRead'])->middleware('auth:sanctum');

    // Family invite (public)
    Route::get('/family/invite/{token}', [\App\Http\Controllers\Api\FamilyInviteController::class, 'show']);
    Route::post('/family/invite/accept', [\App\Http\Controllers\Api\FamilyInviteController::class, 'accept'])->middleware('throttle:10,1');

    // Appointments
    Route::get('/appointment-types', [AppointmentController::class, 'types'])->middleware('auth:sanctum');
    Route::get('/appointments/statistics', [AppointmentController::class, 'statistics'])->middleware('auth:sanctum'); // Must come BEFORE apiResource
    Route::apiResource('appointments', AppointmentController::class)->middleware('auth:sanctum');
    Route::patch('/appointments/{id}/status', [AppointmentController::class, 'updateStatus'])->middleware('auth:sanctum');

    // Incidents
    Route::get('/incidents/export', [\App\Http\Controllers\Api\IncidentController::class, 'export'])->middleware('auth:sanctum');
    Route::get('/incidents/{id}/attachments/{attachmentId}/download', [\App\Http\Controllers\Api\IncidentController::class, 'downloadAttachment'])->middleware('auth:sanctum');
    Route::apiResource('incidents', \App\Http\Controllers\Api\IncidentController::class)->middleware('auth:sanctum');
    Route::post('/incidents/{id}/mark-resolved', [\App\Http\Controllers\Api\IncidentController::class, 'markResolved'])->middleware('auth:sanctum');
    Route::post('/incidents/{id}/mark-closed', [\App\Http\Controllers\Api\IncidentController::class, 'markClosed'])->middleware('auth:sanctum');

    // Compliance / Inspection Package
    Route::get('/compliance/inspection-package', [\App\Http\Controllers\Api\ComplianceReportController::class, 'inspectionPackage'])->middleware('auth:sanctum');

    // Progress notes (API: t-logs)
    Route::get('/t-logs/export/care-logs', [\App\Http\Controllers\Api\TLogController::class, 'exportCareLogs'])->middleware('auth:sanctum');
    Route::apiResource('t-logs', \App\Http\Controllers\Api\TLogController::class)->middleware('auth:sanctum');
    Route::post('/t-logs/{id}/attachments', [\App\Http\Controllers\Api\TLogController::class, 'uploadAttachment'])->middleware('auth:sanctum');
    Route::get('/t-logs/{id}/attachments/{attachmentId}/download', [\App\Http\Controllers\Api\TLogController::class, 'downloadAttachment'])->middleware('auth:sanctum');
    Route::delete('/t-logs/{id}/attachments/{attachmentId}', [\App\Http\Controllers\Api\TLogController::class, 'deleteAttachment'])->middleware('auth:sanctum');

    // Vital Signs
    Route::apiResource('vitals', VitalSignController::class)->middleware('auth:sanctum');

    // Assessments
    Route::apiResource('assessments', AssessmentController::class)->middleware('auth:sanctum');
    Route::patch('/assessments/{id}/status', [AssessmentController::class, 'updateStatus'])->middleware('auth:sanctum');
    Route::patch('/assessments/{assessment}/questions/{question}', [AssessmentQuestionController::class, 'update'])->middleware('auth:sanctum');

    // Medication Dashboard
    Route::get('/medications/dashboard', [MedicationDashboardController::class, 'index'])->middleware('auth:sanctum');

    // Medications
    Route::apiResource('medications', MedicationController::class)->middleware('auth:sanctum');
    Route::get('/medications/administrations', [MedicationController::class, 'administrations'])->middleware('auth:sanctum');

    // Drugs
    Route::apiResource('drugs', DrugController::class)->middleware('auth:sanctum');

    // Medication Administrations (bulk must be registered before apiResource so "bulk" is not treated as an id)
    Route::get('/medication-administrations/stats', [MedicationAdministrationController::class, 'stats'])->middleware('auth:sanctum');
    Route::post('/medication-administrations/mark-missed', [MedicationAdministrationController::class, 'markMissed'])->middleware('auth:sanctum');
    Route::post('/medication-administrations/bulk', [MedicationAdministrationController::class, 'bulkStore'])->middleware('auth:sanctum');
    Route::post('/medication-administrations/bulk-delete', [MedicationAdministrationController::class, 'bulkDestroy'])->middleware('auth:sanctum');
    // Administrator-only: flip a missed dose to administered, preserving the originally scheduled time
    Route::patch('/medication-administrations/{id}/mark-administered', [MedicationAdministrationController::class, 'markAdministered'])->middleware('auth:sanctum');
    Route::apiResource('medication-administrations', MedicationAdministrationController::class)->middleware('auth:sanctum');

    // Medication Deliveries
    Route::apiResource('medication-deliveries', \App\Http\Controllers\Api\MedicationDeliveryController::class)->middleware('auth:sanctum');
    Route::post('/medication-deliveries/bulk', [\App\Http\Controllers\Api\MedicationDeliveryController::class, 'bulkStore'])->middleware('auth:sanctum');

    // Grocery Status Updates
    Route::apiResource('grocery-status-updates', \App\Http\Controllers\Api\GroceryStatusUpdateController::class)->middleware('auth:sanctum');
    Route::patch('/grocery-status-updates/{id}/status', [\App\Http\Controllers\Api\GroceryStatusUpdateController::class, 'updateStatus'])->middleware('auth:sanctum');

    // Fire Drills
    Route::apiResource('fire-drills', \App\Http\Controllers\Api\FireDrillController::class)->middleware('auth:sanctum');
    Route::post('/fire-drills/from-template', [\App\Http\Controllers\Api\FireDrillController::class, 'createFromTemplate'])->middleware('auth:sanctum');
    Route::post('/fire-drills/{id}/mark-complete', [\App\Http\Controllers\Api\FireDrillController::class, 'markComplete'])->middleware('auth:sanctum');
    Route::post('/fire-drills/{id}/cancel', [\App\Http\Controllers\Api\FireDrillController::class, 'cancel'])->middleware('auth:sanctum');

    // Fire Drill Templates
    Route::apiResource('fire-drill-templates', \App\Http\Controllers\Api\FireDrillTemplateController::class)->middleware('auth:sanctum');

    // Pharmacy Templates
    Route::apiResource('pharmacy-templates', \App\Http\Controllers\Api\PharmacyTemplateController::class)->middleware('auth:sanctum');

    // Pharmacy Management
    Route::get('/pharmacy/dashboard/stats', [\App\Http\Controllers\Api\PharmacyDashboardController::class, 'stats'])->middleware('auth:sanctum');
    Route::apiResource('pharmacy-suppliers', \App\Http\Controllers\Api\PharmacySupplierController::class)->middleware('auth:sanctum');
    Route::apiResource('pharmacy-inventory', \App\Http\Controllers\Api\PharmacyInventoryController::class)->middleware('auth:sanctum');
    Route::apiResource('pharmacy-orders', \App\Http\Controllers\Api\PharmacyOrderController::class)->middleware('auth:sanctum');
    Route::post('/pharmacy-orders/{id}/mark-received', [\App\Http\Controllers\Api\PharmacyOrderController::class, 'markAsReceived'])->middleware('auth:sanctum');

    // Grocery Item Templates
    Route::apiResource('grocery-item-templates', \App\Http\Controllers\Api\GroceryItemTemplateController::class)->middleware('auth:sanctum');

    // Sleep Records
    Route::apiResource('sleep-records', SleepRecordController::class)->middleware('auth:sanctum');
    Route::get('sleep-patterns', [\App\Http\Controllers\Api\SleepPatternController::class, 'getPattern'])->middleware('auth:sanctum');

    // Facilities & Branches
    Route::apiResource('facilities', FacilityController::class)->middleware('auth:sanctum');
    Route::post('facilities/{id}', [FacilityController::class, 'update'])->middleware('auth:sanctum'); // For file uploads
    Route::post('facilities/approve-registration/{registrationId}', [FacilityController::class, 'approveRegistration'])->middleware('auth:sanctum');

    // Facility Permissions (Super Admin only)
    Route::get('facilities/{facility}/permissions', [\App\Http\Controllers\Api\FacilityPermissionController::class, 'show'])->middleware('auth:sanctum');
    Route::put('facilities/{facility}/permissions/modules', [\App\Http\Controllers\Api\FacilityPermissionController::class, 'updateModules'])->middleware('auth:sanctum');
    Route::get('facilities/{facility}/permissions/roles/{role}', [\App\Http\Controllers\Api\FacilityPermissionController::class, 'getRolePermissions'])->middleware('auth:sanctum');
    Route::put('facilities/{facility}/permissions/roles/{role}', [\App\Http\Controllers\Api\FacilityPermissionController::class, 'updateRolePermissions'])->middleware('auth:sanctum');

    Route::apiResource('branches', BranchController::class)->middleware('auth:sanctum');
    Route::get('branches/{id}/residents', [BranchController::class, 'residents'])->middleware('auth:sanctum');
    Route::post('branches/{id}/transfer-residents', [BranchController::class, 'transferResidents'])->middleware('auth:sanctum');

    // Geocoding endpoint
    Route::post('/geocode', [GeocodingController::class, 'geocode'])->middleware('auth:sanctum');

    // Facility Registrations
    // Public endpoint for submitting registrations (rate limited to prevent abuse)
    Route::post('facility-registrations', [\App\Http\Controllers\Api\FacilityRegistrationController::class, 'store'])
        ->middleware('throttle:3,10');
    // Protected endpoints for super admin
    Route::get('facility-registrations', [\App\Http\Controllers\Api\FacilityRegistrationController::class, 'index'])->middleware('auth:sanctum');
    Route::get('facility-registrations/{id}', [\App\Http\Controllers\Api\FacilityRegistrationController::class, 'show'])->middleware('auth:sanctum');

    // System Settings (Super Admin only)
    Route::prefix('system-settings')->middleware('auth:sanctum')->group(function () {
        Route::get('/super-admin-theme', [SystemSettingsController::class, 'getSuperAdminTheme']);
        Route::put('/super-admin-theme', [SystemSettingsController::class, 'updateSuperAdminTheme']);
        Route::get('/branding', [SystemSettingsController::class, 'getBranding']);
        Route::put('/branding', [SystemSettingsController::class, 'updateBranding']);
        Route::get('/', [SystemSettingsController::class, 'index']);
    });

    // Vital ranges
    Route::apiResource('vital-ranges', VitalRangeController::class)->middleware('auth:sanctum');

    // Leave Requests
    Route::apiResource('leave-requests', LeaveRequestController::class)->middleware('auth:sanctum');

    // Staff Scheduling
    Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class)->middleware('auth:sanctum');
    Route::apiResource('staff-availability', \App\Http\Controllers\Api\StaffAvailabilityController::class)->middleware('auth:sanctum');

    // Roles & permissions
    Route::apiResource('roles', RoleController::class)->middleware('auth:sanctum');
    Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('auth:sanctum');
    Route::post('/roles/ensure-exist', [RoleController::class, 'ensureRolesExist'])->middleware('auth:sanctum');
    Route::get('/roles/diagnostic', [RoleController::class, 'diagnostic'])->middleware('auth:sanctum');

    // Users
    // Allow POST for file uploads (browser compatibility) - must come before apiResource
    Route::post('/users/{id}', [UserController::class, 'update'])->middleware('auth:sanctum');
    Route::get('/users/{id}/stats', [UserController::class, 'stats'])->middleware('auth:sanctum');
    Route::apiResource('users', UserController::class)->middleware('auth:sanctum');

    // Staff Email Preferences
    Route::prefix('staff-email-preferences')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [StaffEmailPreferenceController::class, 'index']);
        Route::post('/', [StaffEmailPreferenceController::class, 'store']);
        Route::put('/{id}', [StaffEmailPreferenceController::class, 'update']);
        Route::get('/facility-defaults', [StaffEmailPreferenceController::class, 'facilityDefaults']);
        Route::post('/facility-defaults', [StaffEmailPreferenceController::class, 'updateFacilityDefaults']);
    });

    // Employee Documents
    Route::get('/employee-documents/{id}/download', [EmployeeDocumentController::class, 'download'])->middleware('auth:sanctum');
    Route::apiResource('employee-documents', EmployeeDocumentController::class)->middleware('auth:sanctum');

    // Resident Documents
    Route::apiResource('resident-documents', \App\Http\Controllers\Api\ResidentDocumentController::class)->middleware('auth:sanctum');
    Route::post('/resident-documents/{id}/update', [\App\Http\Controllers\Api\ResidentDocumentController::class, 'update'])->middleware('auth:sanctum');
    Route::get('/resident-documents/{id}/download', [\App\Http\Controllers\Api\ResidentDocumentController::class, 'download'])->middleware('auth:sanctum');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->middleware('auth:sanctum');
    Route::get('/notifications/count', [NotificationController::class, 'count'])->middleware('auth:sanctum');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->middleware('auth:sanctum');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->middleware('auth:sanctum');
    Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead'])->middleware('auth:sanctum');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->middleware('auth:sanctum');
    Route::get('/notification-settings', [\App\Http\Controllers\Api\NotificationPreferenceController2::class, 'index'])->middleware('auth:sanctum');
    Route::put('/notification-settings', [\App\Http\Controllers\Api\NotificationPreferenceController2::class, 'update'])->middleware('auth:sanctum');

    // Push subscriptions (PWA push notifications)
    Route::post('/push-subscriptions', [\App\Http\Controllers\Api\PushSubscriptionController::class, 'store'])->middleware('auth:sanctum');
    Route::delete('/push-subscriptions', [\App\Http\Controllers\Api\PushSubscriptionController::class, 'destroy'])->middleware('auth:sanctum');

    // Reminders
    Route::get('/reminders', [ReminderController::class, 'index'])->middleware('auth:sanctum');
    Route::get('/reminders/upcoming', [ReminderController::class, 'upcoming'])->middleware('auth:sanctum');
    Route::get('/reminders/prn-followups/resident/{resident}', [ReminderController::class, 'prnFollowupsForResident'])->middleware('auth:sanctum');
    Route::post('/reminders', [ReminderController::class, 'store'])->middleware('auth:sanctum');
    Route::get('/reminders/{id}', [ReminderController::class, 'show'])->middleware('auth:sanctum');
    Route::put('/reminders/{id}', [ReminderController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/reminders/{id}', [ReminderController::class, 'destroy'])->middleware('auth:sanctum');
    Route::post('/reminders/{id}/pause', [ReminderController::class, 'pause'])->middleware('auth:sanctum');
    Route::post('/reminders/{id}/resume', [ReminderController::class, 'resume'])->middleware('auth:sanctum');
    Route::post('/reminder-events/{id}/acknowledge', [ReminderEventController::class, 'acknowledge'])->middleware('auth:sanctum');
    Route::post('/reminder-events/{id}/snooze', [ReminderEventController::class, 'snooze'])->middleware('auth:sanctum');

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('auth:sanctum');
    Route::get('/activity-logs/stats', [ActivityLogController::class, 'stats'])->middleware('auth:sanctum');
    Route::get('/activity-logs/{id}', [ActivityLogController::class, 'show'])->middleware('auth:sanctum');
    Route::get('/activity-logs/subject/{subjectType}/{subjectId}', [ActivityLogController::class, 'forSubject'])->middleware('auth:sanctum');

    // Charts
    Route::prefix('charts')->middleware('auth:sanctum')->group(function () {
        Route::get('/residents', [ChartController::class, 'residentStats']);
        Route::get('/vitals', [ChartController::class, 'vitalsStats']);
        Route::get('/assessments', [ChartController::class, 'assessmentStats']);
        Route::get('/appointments', [ChartController::class, 'appointmentStats']);
        Route::get('/sleep', [ChartController::class, 'sleepStats']);
        Route::get('/staff', [ChartController::class, 'staffStats']);
    });

    // Analytics
    Route::get('/analytics/dashboard', [\App\Http\Controllers\Api\AnalyticsController::class, 'dashboard'])->middleware('auth:sanctum');

    // Cleaning / Housekeeping
    Route::prefix('cleaning')->middleware('auth:sanctum')->group(function () {
        Route::get('/checklists', [CleaningChecklistController::class, 'index']);
        Route::post('/task-logs', [CleaningChecklistController::class, 'store']);
        Route::get('/areas', [CleaningAreaController::class, 'index']);
        Route::post('/areas', [CleaningAreaController::class, 'store']);
        Route::put('/areas/{cleaningArea}', [CleaningAreaController::class, 'update']);
        Route::delete('/areas/{cleaningArea}', [CleaningAreaController::class, 'destroy']);

        Route::get('/tasks', [CleaningTaskController::class, 'index']);
        Route::post('/tasks', [CleaningTaskController::class, 'store']);
        Route::put('/tasks/{cleaningTask}', [CleaningTaskController::class, 'update']);
        Route::delete('/tasks/{cleaningTask}', [CleaningTaskController::class, 'destroy']);

        Route::get('/dashboard', [HousekeepingReportController::class, 'index']);
        Route::get('/completion-report', [HousekeepingReportController::class, 'completionReport']);
        Route::get('/tasks/{cleaningTask}/assignments', [CleaningTaskAssignmentController::class, 'index']);
        Route::post('/tasks/{cleaningTask}/assignments', [CleaningTaskAssignmentController::class, 'store']);
        Route::delete('/task-assignments/{cleaningTaskAssignment}', [CleaningTaskAssignmentController::class, 'destroy']);
    });

    // Billing & Expenses
    Route::prefix('billing')->middleware('auth:sanctum')->group(function () {
        // Expense Categories
        Route::apiResource('expense-categories', ExpenseCategoryController::class);

        // Expenses
        Route::apiResource('expenses', ExpenseController::class);
        Route::post('/expenses/{id}/approve', [ExpenseController::class, 'approve']);
        Route::post('/expenses/{id}/mark-paid', [ExpenseController::class, 'markAsPaid']);
        Route::post('/expenses/{id}/upload-receipt', [ExpenseController::class, 'uploadReceipt']);

        // Billing Invoices
        Route::apiResource('invoices', BillingInvoiceController::class);
        Route::post('/invoices/{id}/send', [BillingInvoiceController::class, 'send']);
        Route::post('/invoices/{id}/mark-paid', [BillingInvoiceController::class, 'markAsPaid']);

        // Expense Reports
        Route::prefix('reports')->group(function () {
            Route::get('/summary', [ExpenseReportController::class, 'summary']);
            Route::get('/by-category', [ExpenseReportController::class, 'byCategory']);
            Route::get('/by-date-range', [ExpenseReportController::class, 'byDateRange']);
            Route::get('/resident-billing', [ExpenseReportController::class, 'residentBilling']);
            Route::get('/vendor-payments', [ExpenseReportController::class, 'vendorPayments']);
        });

        // Payment Notification Preferences
        Route::get('/notification-preferences', [PaymentNotificationPreferenceController::class, 'index']);
        Route::post('/notification-preferences', [PaymentNotificationPreferenceController::class, 'store']);
        Route::put('/notification-preferences/{id}', [PaymentNotificationPreferenceController::class, 'update']);
    });

    // Staff Clock-In/Out
    Route::prefix('staff')->middleware('auth:sanctum')->group(function () {
        Route::post('/clock-in', [StaffClockInController::class, 'clockIn']);
        Route::post('/clock-out', [StaffClockInController::class, 'clockOut']);
        Route::post('/clock-ins/{id}/clock-out', [StaffClockInController::class, 'clockOutStaff']);
        Route::get('/clock-ins/current', [StaffClockInController::class, 'current']);
        Route::get('/clock-ins', [StaffClockInController::class, 'index']);
        Route::get('/clock-ins/stats', [StaffClockInController::class, 'stats']);
    });

    // Resident Sign-Out/In
    Route::prefix('residents')->middleware('auth:sanctum')->group(function () {
        Route::post('/{id}/sign-out', [ResidentSignOutController::class, 'signOut']);
        Route::post('/{id}/sign-in', [ResidentSignOutController::class, 'signIn']);
        Route::get('/{id}/sign-outs', [ResidentSignOutController::class, 'index']);
    });
    Route::get('/residents/sign-outs/active', [ResidentSignOutController::class, 'active'])->middleware('auth:sanctum');
    Route::get('/residents/sign-outs/overdue', [ResidentSignOutController::class, 'overdue'])->middleware('auth:sanctum');
    Route::get('/residents/sign-outs/history', [ResidentSignOutController::class, 'history'])->middleware('auth:sanctum');

    // Visitors
    Route::prefix('visitors')->middleware('auth:sanctum')->group(function () {
        Route::post('/check-in', [VisitorController::class, 'checkIn']);
        Route::post('/{id}/check-out', [VisitorController::class, 'checkOut']);
        Route::get('/', [VisitorController::class, 'index']);
        Route::get('/active', [VisitorController::class, 'active']);
        Route::get('/{id}', [VisitorController::class, 'show']);
    });

    // Facility Settings (per facility, per category)
    Route::prefix('facilities')->middleware('auth:sanctum')->group(function () {
        Route::get('/{facility}/settings/{category}', [FacilitySettingsController::class, 'show']);
        Route::put('/{facility}/settings/{category}', [FacilitySettingsController::class, 'update']);
        Route::post('/{facility}/settings/email/test', [FacilitySettingsController::class, 'testEmail']);

        // Email Notification Configs
        Route::get('/{facility}/email-notification-configs', [EmailNotificationConfigController::class, 'index']);
        Route::get('/{facility}/email-notification-configs/{notificationType}', [EmailNotificationConfigController::class, 'show']);
        Route::put('/{facility}/email-notification-configs/{notificationType}', [EmailNotificationConfigController::class, 'update']);
        Route::put('/{facility}/email-notification-configs', [EmailNotificationConfigController::class, 'bulkUpdate']);

        // Email Templates
        Route::get('/{facility}/email-templates', [EmailTemplateController::class, 'index']);
        Route::get('/{facility}/email-templates/{notificationType}', [EmailTemplateController::class, 'show']);
        Route::put('/{facility}/email-templates/{notificationType}', [EmailTemplateController::class, 'update']);
        Route::post('/{facility}/email-templates/{notificationType}/preview', [EmailTemplateController::class, 'preview']);
        Route::delete('/{facility}/email-templates/{notificationType}', [EmailTemplateController::class, 'destroy']);
    });

    // Database Management
    Route::prefix('database')->middleware('auth:sanctum')->group(function () {
        Route::get('/stats', [DatabaseManagementController::class, 'stats']);
        Route::post('/backup', [DatabaseManagementController::class, 'createBackup']);
        Route::get('/backups', [DatabaseManagementController::class, 'recentBackups']);
        Route::get('/backup/download', [DatabaseManagementController::class, 'downloadBackup']);
        Route::post('/restore', [DatabaseManagementController::class, 'restoreBackup']);
        Route::post('/refresh', [DatabaseManagementController::class, 'refreshData']);
    });

    // Behavior Chart Data Definitions
    Route::get('/chart-data-definitions', [BehaviorDataController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/chart-data-definitions/bulk', [BehaviorDataController::class, 'bulkUpdate'])->middleware('auth:sanctum');

    // Resident Behavior Charts
    Route::get('/resident-charts', [ResidentChartController::class, 'index'])->middleware('auth:sanctum');
    Route::get('/resident-charts/{resident}', [ResidentChartController::class, 'show'])->middleware('auth:sanctum');
    Route::get('/resident-charts/by-id/{id}', [ResidentChartController::class, 'showChart'])->middleware('auth:sanctum');
    Route::post('/resident-charts', [ResidentChartController::class, 'store'])->middleware('auth:sanctum');
    Route::put('/resident-charts/{id}/status', [ResidentChartController::class, 'updateStatus'])->middleware('auth:sanctum');
    Route::get('/resident-charts/{resident}/pending', [ResidentChartController::class, 'pending'])->middleware('auth:sanctum');
    Route::get('/resident-charts/{resident}/history', [ResidentChartController::class, 'history'])->middleware('auth:sanctum');

    // Fax module
    Route::prefix('fax')->middleware('auth:sanctum')->group(function () {
        Route::get('/providers', [FaxSettingsController::class, 'providers']);
        Route::get('/settings', [FaxSettingsController::class, 'show']);
        Route::put('/settings', [FaxSettingsController::class, 'update']);
        Route::post('/settings/test-connection', [FaxSettingsController::class, 'testConnection']);
        Route::get('/settings/webhook-url', [FaxSettingsController::class, 'webhookUrl']);
        Route::post('/settings/rotate-webhook', [FaxSettingsController::class, 'rotateWebhook']);

        Route::apiResource('contacts', FaxContactController::class);

        Route::get('/numbers', [FaxNumberController::class, 'index']);
        Route::post('/numbers/search', [FaxNumberController::class, 'search']);
        Route::post('/numbers', [FaxNumberController::class, 'store']);
        Route::patch('/numbers/{id}', [FaxNumberController::class, 'update']);
        Route::delete('/numbers/{id}', [FaxNumberController::class, 'destroy']);

        // Specific routes BEFORE the catch-all "/{id}" so they don't get
        // swallowed by the wildcard.
        Route::get('/cost-summary', [FaxController::class, 'costSummary']);
        Route::post('/send', [FaxController::class, 'send']);
        Route::get('/', [FaxController::class, 'index']);
        Route::get('/{id}', [FaxController::class, 'show'])->whereNumber('id');
        Route::get('/{id}/download', [FaxController::class, 'download'])->whereNumber('id');
        Route::post('/{id}/retry', [FaxController::class, 'retry'])->whereNumber('id');
        Route::post('/{id}/attach-resident', [FaxController::class, 'attachResident'])->whereNumber('id');
        Route::delete('/{id}', [FaxController::class, 'destroy'])->whereNumber('id');
    });

    // Broadcasting authentication (same as /user: no SetFacilityContext — auth runs cleanly for Sanctum)
    Route::post('/broadcasting/auth', function () {
        return \Illuminate\Support\Facades\Broadcast::auth(request());
    })->middleware('auth:sanctum')
        ->withoutMiddleware([\App\Http\Middleware\SetFacilityContext::class]);
});

// Public per-facility fax webhook endpoints. These MUST stay outside the
// auth:sanctum group AND outside the SetFacilityContext middleware group
// (no authenticated user exists on a webhook). Each controller looks up
// the facility from the URL secret and verifies the provider signature
// before doing anything else.
Route::post('/webhooks/fax/telnyx/{secret}', TelnyxFaxWebhookController::class);
Route::post('/webhooks/fax/documo/{secret}', DocumoFaxWebhookController::class);
Route::post('/webhooks/fax/fake/{secret}', FakeFaxWebhookController::class);
