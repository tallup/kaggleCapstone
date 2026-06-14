# Fix: Administrator Role Not Showing in Production

## Problem
The "Administrator" role is not showing in the role dropdown on the "Create User" form in production, but it works in local development.

## Root Cause
The `administrator` role doesn't exist in the production database. The API correctly filters for it, but if the role doesn't exist, it won't appear in the dropdown.

## Solution Implemented

I've updated the `RoleController` to automatically ensure required roles exist when the roles API is called. This means:

1. **Automatic Role Creation**: When you access the roles endpoint, it will automatically check if the `administrator` role exists, and create it if it doesn't.

2. **Permission Sync**: If the administrator role is created, it will automatically sync all available permissions to it.

## What You Need to Do in Production

### Option 1: Automatic Fix (Recommended)
The fix is already in place. Simply:
1. Deploy the updated code
2. Visit the "Create User" page - the administrator role should now appear
3. The role will be automatically created on first access

### Option 2: Manual Fix via Artisan Command
If you want to ensure roles exist before deploying:

```bash
php artisan roles:ensure-exist
```

This will create all required roles including `administrator`.

### Option 3: Manual Fix via API
You can also use the API endpoint to ensure roles exist:

```bash
# Via curl or Postman
POST /api/roles/ensure-exist
```

## Verification

After deploying, you can verify the role exists by:

1. **Check the dropdown**: Go to Administration → Users → Create User and check if "Administrator (Facility-wide)" appears in the role dropdown.

2. **Check database directly**:
   ```sql
   SELECT * FROM roles WHERE name = 'administrator';
   ```

3. **Check via API**:
   ```bash
   GET /api/roles
   ```
   You should see `administrator` in the response.

## Additional Notes

- The fix ensures `administrator`, `admin`, `caregiver`, and `nurse` roles exist
- If permissions exist in the database, they will be automatically synced to the administrator role
- This is a one-time operation - once the role exists, it won't be recreated

## Files Changed

- `app/Http/Controllers/Api/RoleController.php` - Added `ensureRequiredRolesExist()` method that runs before returning roles


