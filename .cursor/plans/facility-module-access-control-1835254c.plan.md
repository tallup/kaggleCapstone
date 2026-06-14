---
name: Facility-Level Module Access Control Implementation
overview: ""
todos: []
---

# Facility-Level Module Access Control Implementation

## Overview

Add a facility-level module restriction system that works alongside the existing role-based permissions. This will allow administrators to control which modules (e.g., Pharmacy, Medications, Vitals) are accessible to users within each facility, regardless of their role permissions.

## Database Changes

### 1. Create `facility_modules` pivot table

- **File**: New migration `create_facility_modules_table.php`
- **Structure**:
- `facility_id` (foreign key to facilities)
- `module` (string, e.g., 'pharmacy', 'medications', 'vitals')
- `is_enabled` (boolean, default true)
- Timestamps
- Unique constraint on `[facility_id, module]`

### 2. Add relationship to Facility model

- **File**: `app/Models/Facility.php`
- Add `modules()` relationship method
- Add helper methods: `hasModuleAccess()`, `enableModule()`, `disableModule()`

## Module Definition System

### 3. Create Module Constants/Enum

- **File**: `app/Constants/Modules.php` or `app/Enums/Module.php`
- Define all available modules:
- `PHARMACY = 'pharmacy'`
- `MEDICATIONS = 'medications'`
- `VITALS = 'vitals'`
- `APPOINTMENTS = 'appointments'`
- `ASSESSMENTS = 'assessments'`
- `SLEEP = 'sleep'`
- `HOUSEKEEPING = 'housekeeping'`
- `REPORTS = 'reports'`
- etc.

## Access Control Logic

### 4. Update User Model Permission Check

- **File**: `app/Models/User.php`
- Modify `hasPermission()` method to also check facility module access
- Add `hasModuleAccess()` method that checks:

1. User's role has the permission
2. User's facility has the module enabled
3. Super admins bypass facility restrictions

### 5. Create Middleware for Module Access

- **File**: `app/Http/Middleware/EnsureModuleAccess.php`
- Check module access before allowing route access
- Return 403 if module is disabled for user's facility

## Filament Admin Interface

### 6. Create Facility Module Management Resource

- **File**: `app/Filament/Resources/FacilityModuleResource.php`
- Allow super admins to manage module access per facility
- Display facility list with checkboxes for each module
- Or add module management section to existing FacilityResource

### 7. Update FacilityResource

- **File**: `app/Filament/Resources/FacilityResource.php`
- Add "Module Access" section to facility form
- Show enabled/disabled modules per facility

## Frontend Integration

### 8. Update Navigation/Routes

- **File**: `app/Filament/Navigation/CustomNavigationProvider.php`
- Hide navigation items if user's facility doesn't have module access
- **File**: `resources/js/components/Layout.jsx`
- Hide frontend routes/menu items based on module access

### 9. Update API Controllers

- **Files**: All relevant API controllers (PharmacySupplierController, PharmacyInventoryController, etc.)
- Add module access checks in controller methods
- Return appropriate error messages if module is disabled

## Migration & Seeding

### 10. Create Migration for Existing Data

- **File**: New migration `enable_all_modules_for_existing_facilities.php`
- Enable all modules for existing facilities (default behavior)
- Or leave disabled and require explicit enabling

### 11. Update Seeders

- Ensure module definitions are consistent across seeders

## Testing Considerations

- Test that users with proper role permissions but disabled facility module cannot access
- Test that super admins can access all modules regardless
- Test that enabling/disabling modules takes effect immediately
- Test navigation visibility based on module access