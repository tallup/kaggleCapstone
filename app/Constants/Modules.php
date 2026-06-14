<?php

namespace App\Constants;

class Modules
{
    public const PHARMACY = 'pharmacy';

    public const MEDICATIONS = 'medications';

    public const VITALS = 'vitals';

    public const APPOINTMENTS = 'appointments';

    public const ASSESSMENTS = 'assessments';

    public const SLEEP = 'sleep';

    public const HOUSEKEEPING = 'housekeeping';

    public const REPORTS = 'reports';

    public const RESIDENTS = 'residents';

    public const BEHAVIORS = 'behaviors';

    public const INCIDENTS = 'incidents';

    public const LEAVE_REQUESTS = 'leave_requests';

    public const EMPLOYEE_DOCUMENTS = 'employee_documents';

    public const GROCERY_STATUS = 'grocery_status';

    public const FIRE_DRILLS = 'fire_drills';

    public const BILLING_EXPENSES = 'billing_expenses';

    public const STAFF_SCHEDULING = 'staff_scheduling';

    public const FAX = 'fax';

    /**
     * Get all available modules
     */
    public static function all(): array
    {
        return [
            self::PHARMACY => 'Pharmacy',
            self::MEDICATIONS => 'Medications',
            self::VITALS => 'Vitals',
            self::APPOINTMENTS => 'Appointments',
            self::ASSESSMENTS => 'Assessments',
            self::SLEEP => 'Sleep Records',
            self::HOUSEKEEPING => 'Housekeeping',
            self::REPORTS => 'Reports',
            self::RESIDENTS => 'Residents',
            self::BEHAVIORS => 'Behaviors',
            self::INCIDENTS => 'Incidents',
            self::LEAVE_REQUESTS => 'Leave Requests',
            self::EMPLOYEE_DOCUMENTS => 'Employee Documents',
            self::GROCERY_STATUS => 'Grocery Status',
            self::FIRE_DRILLS => 'Fire Drills',
            self::BILLING_EXPENSES => 'Billing & Expenses',
            self::STAFF_SCHEDULING => 'Staff Scheduling',
            self::FAX => 'Fax',
        ];
    }

    /**
     * Get module display name
     */
    public static function getDisplayName(string $module): string
    {
        return self::all()[$module] ?? ucfirst(str_replace('_', ' ', $module));
    }

    /**
     * Check if module is valid
     */
    public static function isValid(string $module): bool
    {
        return array_key_exists($module, self::all());
    }
}
