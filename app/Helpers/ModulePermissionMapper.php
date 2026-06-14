<?php

namespace App\Helpers;

use App\Constants\Modules;

class ModulePermissionMapper
{
    /**
     * Map permission names to module names
     */
    private static array $permissionToModuleMap = [
        // Pharmacy module
        'view_pharmacy_suppliers' => Modules::PHARMACY,
        'create_pharmacy_suppliers' => Modules::PHARMACY,
        'edit_pharmacy_suppliers' => Modules::PHARMACY,
        'delete_pharmacy_suppliers' => Modules::PHARMACY,
        'view_pharmacy_inventory' => Modules::PHARMACY,
        'create_pharmacy_inventory' => Modules::PHARMACY,
        'edit_pharmacy_inventory' => Modules::PHARMACY,
        'delete_pharmacy_inventory' => Modules::PHARMACY,
        'view_pharmacy_orders' => Modules::PHARMACY,
        'create_pharmacy_orders' => Modules::PHARMACY,
        'edit_pharmacy_orders' => Modules::PHARMACY,
        'delete_pharmacy_orders' => Modules::PHARMACY,

        // Medications module
        'view_medications' => Modules::MEDICATIONS,
        'create_medications' => Modules::MEDICATIONS,
        'edit_medications' => Modules::MEDICATIONS,
        'delete_medications' => Modules::MEDICATIONS,
        'view_medication_administration' => Modules::MEDICATIONS,
        'create_medication_administration' => Modules::MEDICATIONS,
        'edit_medication_administration' => Modules::MEDICATIONS,
        'view_medication_history' => Modules::MEDICATIONS,
        'administer_medications' => Modules::MEDICATIONS,
        'view_medication_reports' => Modules::MEDICATIONS,

        // Vitals module
        'view_vital_signs' => Modules::VITALS,
        'create_vital_signs' => Modules::VITALS,
        'edit_vital_signs' => Modules::VITALS,
        'delete_vital_signs' => Modules::VITALS,
        'view_vitals' => Modules::VITALS,
        'create_vitals' => Modules::VITALS,
        'edit_vitals' => Modules::VITALS,
        'delete_vitals' => Modules::VITALS,
        'view_vitals_history' => Modules::VITALS,
        'view_vital_ranges' => Modules::VITALS,
        'create_vital_ranges' => Modules::VITALS,
        'edit_vital_ranges' => Modules::VITALS,
        'delete_vital_ranges' => Modules::VITALS,
        'view_vitals_reports' => Modules::VITALS,

        // Appointments module
        'view_appointments' => Modules::APPOINTMENTS,
        'create_appointments' => Modules::APPOINTMENTS,
        'edit_appointments' => Modules::APPOINTMENTS,
        'delete_appointments' => Modules::APPOINTMENTS,
        'view_appointment_history' => Modules::APPOINTMENTS,
        'view_appointment_reports' => Modules::APPOINTMENTS,

        // Assessments module
        'view_assessments' => Modules::ASSESSMENTS,
        'create_assessments' => Modules::ASSESSMENTS,
        'edit_assessments' => Modules::ASSESSMENTS,
        'delete_assessments' => Modules::ASSESSMENTS,
        'complete_assessments' => Modules::ASSESSMENTS,
        'view_assessment_reports' => Modules::ASSESSMENTS,

        // Sleep module
        'view_sleep_records' => Modules::SLEEP,
        'create_sleep_records' => Modules::SLEEP,
        'edit_sleep_records' => Modules::SLEEP,
        'delete_sleep_records' => Modules::SLEEP,
        'view_sleep_patterns' => Modules::SLEEP,

        // Housekeeping module
        'view_cleaning_areas' => Modules::HOUSEKEEPING,
        'create_cleaning_areas' => Modules::HOUSEKEEPING,
        'edit_cleaning_areas' => Modules::HOUSEKEEPING,
        'delete_cleaning_areas' => Modules::HOUSEKEEPING,
        'assign_cleaning_tasks' => Modules::HOUSEKEEPING,

        // Reports module
        'view_reports' => Modules::REPORTS,
        'create_reports' => Modules::REPORTS,
        'export_reports' => Modules::REPORTS,
        'view_staff_reports' => Modules::REPORTS,
        'view_sleep_reports' => Modules::REPORTS,

        // Residents module
        'view_residents' => Modules::RESIDENTS,
        'create_residents' => Modules::RESIDENTS,
        'edit_residents' => Modules::RESIDENTS,
        'delete_residents' => Modules::RESIDENTS,
        'view_resident_details' => Modules::RESIDENTS,
        'view_resident_reports' => Modules::RESIDENTS,

        // Behaviors module
        'view_behaviors' => Modules::BEHAVIORS,
        'create_behaviors' => Modules::BEHAVIORS,
        'edit_behaviors' => Modules::BEHAVIORS,
        'delete_behaviors' => Modules::BEHAVIORS,

        // Incidents module
        'view_incidents' => Modules::INCIDENTS,
        'create_incidents' => Modules::INCIDENTS,
        'edit_incidents' => Modules::INCIDENTS,
        'delete_incidents' => Modules::INCIDENTS,

        // Leave Requests module
        'view_leave_requests' => Modules::LEAVE_REQUESTS,
        'create_leave_requests' => Modules::LEAVE_REQUESTS,
        'edit_leave_requests' => Modules::LEAVE_REQUESTS,
        'approve_leave_requests' => Modules::LEAVE_REQUESTS,
        'reject_leave_requests' => Modules::LEAVE_REQUESTS,

        // Employee Documents module
        'view_employee_documents' => Modules::EMPLOYEE_DOCUMENTS,
        'create_employee_documents' => Modules::EMPLOYEE_DOCUMENTS,
        'edit_employee_documents' => Modules::EMPLOYEE_DOCUMENTS,
        'delete_employee_documents' => Modules::EMPLOYEE_DOCUMENTS,

        // Billing & Expenses module
        'view_expenses' => Modules::BILLING_EXPENSES,
        'create_expenses' => Modules::BILLING_EXPENSES,
        'edit_expenses' => Modules::BILLING_EXPENSES,
        'delete_expenses' => Modules::BILLING_EXPENSES,
        'view_expense_categories' => Modules::BILLING_EXPENSES,
        'create_expense_categories' => Modules::BILLING_EXPENSES,
        'edit_expense_categories' => Modules::BILLING_EXPENSES,
        'delete_expense_categories' => Modules::BILLING_EXPENSES,
        'view_billing_invoices' => Modules::BILLING_EXPENSES,
        'create_billing_invoices' => Modules::BILLING_EXPENSES,
        'edit_billing_invoices' => Modules::BILLING_EXPENSES,
        'delete_billing_invoices' => Modules::BILLING_EXPENSES,
        'approve_expenses' => Modules::BILLING_EXPENSES,
        'view_expense_reports' => Modules::BILLING_EXPENSES,

        // Fax module
        'fax.view' => Modules::FAX,
        'fax.send' => Modules::FAX,
        'fax.receive' => Modules::FAX,
        'fax.delete' => Modules::FAX,
        'fax.manage_contacts' => Modules::FAX,
        'fax.manage_numbers' => Modules::FAX,
        'fax.manage_settings' => Modules::FAX,
    ];

    /**
     * Get module for a permission
     */
    public static function getModuleForPermission(string $permission): ?string
    {
        return self::$permissionToModuleMap[$permission] ?? null;
    }

    /**
     * Check if permission requires module access check
     */
    public static function requiresModuleCheck(string $permission): bool
    {
        return isset(self::$permissionToModuleMap[$permission]);
    }

    /**
     * Get all permissions for a module
     */
    public static function getPermissionsForModule(string $module): array
    {
        return array_keys(array_filter(
            self::$permissionToModuleMap,
            fn ($m) => $m === $module
        ));
    }
}
