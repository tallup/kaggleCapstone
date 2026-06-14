/**
 * Medication Hub — UI permission helpers (PRD: narc / add med / MAR sign = admins).
 * Backend must enforce the same rules; these only gate buttons and tabs.
 */

export function isMedicationClinicalAdmin(user) {
    if (!user?.role) return false;
    const role = String(user.role).toLowerCase().trim();
    if (role === 'super_admin') return true;
    return role === 'administrator' || role === 'admin';
}
