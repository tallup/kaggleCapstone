<?php

namespace App\Constants;

class UserRoles
{
    /**
     * Roles that are considered caregivers
     */
    public const CAREGIVER_ROLES = [
        'caregiver',
        'care_giver',
        'nurse',
        'registered_nurse',
        'licensed_nurse',
    ];

    /**
     * All available user roles
     */
    public const ROLES = [
        'super_admin' => 'Super Admin',
        'administrator' => 'Administrator (Facility-wide)',
        'admin' => 'Admin (Branch-level)',
        'clinical_supervisor' => 'Clinical Supervisor',
        'caregiver' => 'Caregiver',
        'care_giver' => 'Care Giver',
        'nurse' => 'Nurse',
        'registered_nurse' => 'Registered Nurse',
        'licensed_nurse' => 'Licensed Nurse',
        'family_member' => 'Family Member',
        'manager' => 'Manager',
        'support_staff' => 'Support Staff',
    ];

    /**
     * Check if a role is a caregiver role
     */
    public static function isCaregiverRole(?string $role): bool
    {
        if (!$role) {
            return false;
        }

        return in_array(strtolower(trim($role)), array_map('strtolower', self::CAREGIVER_ROLES));
    }
}




































