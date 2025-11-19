# Deployment Fix - Table Already Exists Error

## Issue
Deployment failed with error: `Table 'grocery_status_updates' already exists`

## Root Cause
The tables were already created on the production server (possibly manually or from a previous deployment attempt), but the migrations were trying to create them again.

## Solution Applied
Updated all three new table migrations to check if tables exist before creating them:

1. ✅ `2025_11_19_003000_create_fire_drills_table.php` - Added `Schema::hasTable()` check
2. ✅ `2025_11_19_003329_create_medication_deliveries_table.php` - Added `Schema::hasTable()` check
3. ✅ `2025_11_19_004126_create_grocery_status_updates_table.php` - Added `Schema::hasTable()` check
4. ✅ `2025_11_19_002751_add_medicare_and_primary_care_to_residents_table.php` - Added `Schema::hasColumn()` checks

## Migration Changes

All migrations now use this pattern:

```php
public function up(): void
{
    if (Schema::hasTable('table_name')) {
        return; // Skip if table already exists
    }
    
    Schema::create('table_name', function (Blueprint $table) {
        // ... table definition
    });
}
```

For column additions:
```php
public function up(): void
{
    Schema::table('residents', function (Blueprint $table) {
        if (!Schema::hasColumn('residents', 'medicare_number')) {
            $table->string('medicare_number')->nullable()->after('physician_name');
        }
        // ... more columns
    });
}
```

## Deployment Instructions

1. **Commit the fixed migrations**:
   ```bash
   git add database/migrations/
   git commit -m "Fix: Add table existence checks to prevent deployment errors"
   git push
   ```

2. **Deploy again** - The migrations will now skip if tables already exist

3. **Verify** - After deployment, check that all tables exist:
   ```bash
   php artisan migrate:status
   ```

## Alternative: If Tables Need to be Recreated

If you need to drop and recreate the tables (⚠️ **WARNING: This will delete data**):

```bash
# On production server (SSH)
php artisan migrate:rollback --step=3
php artisan migrate
```

## Status
✅ **Fixed** - Migrations are now idempotent and safe to run multiple times

