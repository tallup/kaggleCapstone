// Permission mapping for navigation items
// Maps navigation paths to required permission(s). Use a string for one permission, or an array of
// strings — user needs at least one (OR). Example: Drugs shows if user has view_drugs OR view_medications.
export const PERMISSION_MAP = {
  // Organization hub
  '/organization/residents': 'view_residents',
  '/organization/resident-contacts': 'view_residents',
  '/organization/branches': 'view_branches',
  '/organization/vital-ranges': 'view_vital_ranges',
  '/organization/drugs': ['view_drugs', 'view_medications', 'create_drugs', 'edit_drugs', 'delete_drugs'],
  // Team & compliance hub
  '/team/leave-requests': 'view_leave_requests',
  '/team/roles': 'view_roles',
  '/team/users': 'view_users',
  '/team/facility-permissions': ['view_roles', 'view_permissions'],
  '/team/deactivated': 'view_users',
  '/team/employee-documents': 'view_employee_documents',
  '/team/activity-logs': ['view_activity_logs', 'view_users'],

  // Legacy /administration/* (redirects; kept for bookmarks / deep links)
  '/administration/residents': 'view_residents',
  '/administration/branches': 'view_branches',
  '/administration/vital-ranges': 'view_vital_ranges',
  '/administration/leave-requests': 'view_leave_requests',
  '/staff/schedule': 'view_schedules',
  '/staff/availability': 'view_schedules',
  '/staff/attendance': 'view_schedules',
  '/administration/roles': 'view_roles',
  '/administration/users': 'view_users',
  '/administration/drugs': ['view_drugs', 'view_medications', 'create_drugs', 'edit_drugs', 'delete_drugs'],
  '/administration/deactivated': 'view_users',
  '/administration/employee-documents': 'view_employee_documents',
  '/administration/activity-logs': ['view_activity_logs', 'view_users'],
  
  // Other navigation items that require specific permissions
  '/my-residents': 'view_residents',
  '/residents': 'view_residents',
};

/**
 * Check if a navigation item should be visible based on permissions
 */
export function hasPermissionAccess(path, userPermissions, isSuperAdmin) {
  // Super admins have access to everything
  if (isSuperAdmin) {
    return true;
  }

  // Ensure userPermissions is an array
  if (!Array.isArray(userPermissions)) {
    userPermissions = [];
  }

  // If no permissions provided, deny access
  if (userPermissions.length === 0) {
    return false;
  }

  // Check if path requires a specific permission (or any of several)
  const required = PERMISSION_MAP[path];

  // If path doesn't require a permission, allow access
  if (!required) {
    return true;
  }

  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((p) => userPermissions.includes(p));
}

/**
 * Filter navigation items based on permission access
 */
export function filterNavigationByPermissionAccess(navigationItems, userPermissions, isSuperAdmin) {
  return navigationItems
    .map(item => {
      // Check if main item has permission access
      const hasAccess = hasPermissionAccess(item.path, userPermissions, isSuperAdmin);
      
      // Filter children if they exist
      let filteredChildren = null;
      if (item.children && Array.isArray(item.children)) {
        filteredChildren = item.children.filter(child => 
          hasPermissionAccess(child.path, userPermissions, isSuperAdmin)
        );
      }

      // If item has no access and no accessible children, exclude it
      if (!hasAccess && (!filteredChildren || filteredChildren.length === 0)) {
        return null;
      }

      // Return item with filtered children
      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter(item => item !== null);
}










