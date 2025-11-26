// Permission mapping for navigation items
// Maps navigation paths to their required permissions
export const PERMISSION_MAP = {
  // Administration menu items
  '/administration/residents': 'view_residents',
  '/administration/branches': 'view_branches',
  '/administration/vital-ranges': 'view_vital_ranges',
  '/administration/leave-requests': 'view_leave_requests',
  '/administration/roles': 'view_roles',
  '/administration/users': 'view_users',
  '/administration/drugs': 'view_drugs',
  '/administration/deactivated': 'view_users', // Inactive records
  '/administration/employee-documents': 'view_employee_documents',
  '/administration/activity-logs': 'view_activity_logs',
  
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

  // If no permissions provided, deny access
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Check if path requires a specific permission
  const requiredPermission = PERMISSION_MAP[path];
  
  // If path doesn't require a permission, allow access
  if (!requiredPermission) {
    return true;
  }

  // Check if the user has the required permission
  return userPermissions.includes(requiredPermission);
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








