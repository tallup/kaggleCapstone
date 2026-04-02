// Permission mapping for navigation items
// Maps navigation paths to required permission(s). Use a string for one permission, or an array of
// strings — user needs at least one (OR). Example: Drugs shows if user has view_drugs OR view_medications.
export const PERMISSION_MAP = {
  // Administration menu items
  '/administration/residents': 'view_residents',
  '/administration/branches': 'view_branches',
  '/administration/vital-ranges': 'view_vital_ranges',
  '/administration/leave-requests': 'view_leave_requests',
  '/staff/schedule': 'view_schedules',
  '/staff/availability': 'view_schedules',
  '/staff/attendance': 'view_schedules',
  '/administration/roles': 'view_roles',
  '/administration/users': 'view_users',
  // Facility admins often have medication access without explicit view_drugs on the role
  '/administration/drugs': ['view_drugs', 'view_medications', 'create_drugs', 'edit_drugs', 'delete_drugs'],
  '/administration/deactivated': 'view_users', // Inactive records
  '/administration/employee-documents': 'view_employee_documents',
  // Facility admins usually have view_users; view_activity_logs may be missing from older DB seeds
  '/administration/activity-logs': ['view_activity_logs', 'view_users'],
  
  // Other navigation items that require specific permissions
  '/my-residents': 'view_residents',
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










