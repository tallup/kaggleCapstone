/**
 * Aligns with App\Constants\UserRoles::CAREGIVER_ROLES
 */
export const CAREGIVER_ROLES = [
    'caregiver',
    'care_giver',
    'nurse',
    'registered_nurse',
    'licensed_nurse',
];

export function isCaregiverRole(role) {
    if (!role) return false;
    return CAREGIVER_ROLES.includes(String(role).toLowerCase().trim());
}

/**
 * Matches resident write access in ResidentController@update (non-caregiver + admin or edit_residents).
 */
export function canEditResidentCarePlan(user) {
    if (!user || isCaregiverRole(user.role)) return false;
    if (user.role === 'super_admin') return true;
    if (user.is_any_admin === true) return true;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes('edit_residents');
}
