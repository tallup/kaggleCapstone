// Module mapping for navigation items
// Maps navigation paths to their corresponding modules
export const MODULE_MAP = {
  // Pharmacy module
  '/pharmacy': 'pharmacy',
  '/pharmacy/suppliers': 'pharmacy',
  '/pharmacy/inventory': 'pharmacy',
  '/pharmacy/orders': 'pharmacy',
  
  // Medications module
  '/medications': 'medications',
  '/medication-deliveries': 'medications',
  '/medication-history': 'medications',
  '/medications/residents': 'medications',
  
  // Vitals module
  '/vitals': 'vitals',
  '/view-vitals': 'vitals',
  
  // Appointments module
  '/appointments': 'appointments',
  
  // Assessments module
  '/assessments': 'assessments',
  
  // Sleep module
  '/sleep': 'sleep',
  '/sleep-patterns': 'sleep',
  
  // Housekeeping module
  '/housekeeping': 'housekeeping',
  '/housekeeping/dashboard': 'housekeeping',
  '/housekeeping/schedule': 'housekeeping',
  
  // Reports module
  '/reports': 'reports',
  '/reports/charts': 'reports',
  '/reports/resident-charts': 'reports',
  '/reports/vitals-charts': 'reports',
  '/reports/vitals-reports': 'reports',
  '/reports/assessment-charts': 'reports',
  '/reports/appointments-charts': 'reports',
  '/reports/vitals-history': 'reports',
  '/reports/sleep-charts': 'reports',
  '/reports/staff-charts': 'reports',
  '/reports/care-logs': 'reports',
  '/reports/inspection-package': 'reports',
  
  // Residents module
  '/administration/residents': 'residents',
  '/my-residents': 'residents',
  
  // Grocery Status module
  '/grocery-status': 'grocery_status',
  
  // Fire Drills module
  '/fire-drills': 'fire_drills',
  
  // Incidents module
  '/incidents': 'incidents',
  
  // Leave Requests module
  '/leave-requests': 'leave_requests',
  '/administration/leave-requests': 'leave_requests',
  
  // Staff Scheduling module
  '/staff/schedule': 'staff_scheduling',
  '/staff/availability': 'staff_scheduling',
  '/staff/attendance': 'staff_scheduling',
  
  // Billing & Expenses module
  '/billing/expense-categories': 'billing_expenses',
  '/billing/expenses': 'billing_expenses',
  '/billing/invoices': 'billing_expenses',
  '/billing/reports': 'billing_expenses',
};

/**
 * Check if a navigation item should be visible based on module access
 */
export function hasModuleAccess(path, enabledModules, isSuperAdmin) {
  // Super admins have access to everything
  if (isSuperAdmin) {
    return true;
  }

  // Ensure enabledModules is an array
  if (!Array.isArray(enabledModules)) {
    enabledModules = [];
  }

  // If no enabled modules are configured, allow access to all modules by default.
  // This matches the navigation behavior where we only filter when modules exist.
  // It also prevents users from being redirected away from pages when module
  // settings have not been set up yet.
  if (enabledModules.length === 0) {
    return true;
  }

  // Check if path requires a specific module
  const requiredModule = MODULE_MAP[path];
  
  // If path doesn't require a module, allow access
  if (!requiredModule) {
    return true;
  }

  // Check if the required module is enabled
  return enabledModules.includes(requiredModule);
}

/**
 * Filter navigation items based on module access
 */
export function filterNavigationByModuleAccess(navigationItems, enabledModules, isSuperAdmin) {
  return navigationItems
    .map(item => {
      // Check if main item has module access
      const hasAccess = hasModuleAccess(item.path, enabledModules, isSuperAdmin);
      
      // Filter children if they exist
      let filteredChildren = null;
      if (item.children && Array.isArray(item.children)) {
        filteredChildren = item.children.filter(child => 
          hasModuleAccess(child.path, enabledModules, isSuperAdmin)
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

