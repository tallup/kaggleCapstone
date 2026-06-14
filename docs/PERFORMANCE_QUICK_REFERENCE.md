# Performance Optimization Quick Reference

## ✅ Completed Optimizations

### 1. Database Indexes
- ✅ Index on `branches.facility_id`
- ✅ Composite index on `branches(['facility_id', 'is_active'])`
- ✅ Composite index on `residents(['branch_id', 'is_active', 'status'])`
- ✅ Composite index on `appointments(['branch_id', 'status', 'appointment_date'])`

### 2. Query Optimizations
- ✅ Replaced `whereHas('branch')` with `whereIn('branch_id', $branchIds)` in:
  - AppointmentController
  - VitalSignController
  - AssessmentController
  - ChartController (multiple methods)
  - AnalyticsController (multiple methods)
  - LeaveRequestController

### 3. Caching
- ✅ Branch IDs cached (1 hour TTL)
- ✅ Cache auto-invalidated on branch save/delete
- ✅ Helper method: `BaseApiController::getFacilityBranchIds()`

### 4. Configuration
- ✅ Debug mode: `false`
- ✅ OPcache: Enabled
- ✅ Cache driver: `file` (ready for `redis` in production)
- ✅ Config/Routes/Views: Cached

## Quick Commands

### Check Performance Settings
```bash
# Check debug mode
php artisan tinker --execute="echo config('app.debug') ? 'ON' : 'OFF';"

# Check cache driver
php artisan tinker --execute="echo config('cache.default');"

# Check OPcache
php -i | grep opcache.enable
```

### Clear and Rebuild Caches
```bash
php artisan optimize:clear  # Clear all
php artisan optimize         # Rebuild all
```

### Verify Indexes (MySQL)
```sql
SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%';
```

### Verify Indexes (PostgreSQL)
```sql
\d+ branches
```

## Performance Monitoring

### Check Query Counts
Use Laravel Telescope (if installed):
```bash
composer require laravel/telescope --dev
php artisan telescope:install
```

### Monitor Cache
```bash
php artisan tinker
>>> Cache::get('facility.1.branches')  # Should return branch IDs array
```

## Expected Improvements

- **Query Count**: 50-70% reduction
- **Response Time**: 30-50% faster
- **Facility Queries**: 50-70% faster (with indexes)
- **Scalability**: Ready for 50+ facilities

## Next Steps (Optional)

1. **Install Redis** (for production):
   ```bash
   sudo apt-get install redis-server
   ```

2. **Switch to Redis** in `.env`:
   ```env
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   ```

3. **Migrate to MySQL/PostgreSQL** (see `DATABASE_MIGRATION_GUIDE.md`)

## Troubleshooting

### If queries are still slow:
1. Verify indexes exist: Run SQL commands above
2. Clear caches: `php artisan optimize:clear`
3. Check for N+1 queries: Use Telescope/Debugbar
4. Verify cache is working: Check cache keys

### If cache issues:
1. Clear cache: `php artisan cache:clear`
2. Verify cache driver: `config('cache.default')`
3. Check cache permissions: `storage/framework/cache`

## Files Modified

- `database/migrations/2025_12_21_013700_add_indexes_to_branches_table.php`
- `database/migrations/2025_12_21_013701_add_composite_indexes_for_performance.php`
- `app/Http/Controllers/Api/AppointmentController.php`
- `app/Http/Controllers/Api/VitalSignController.php`
- `app/Http/Controllers/Api/AssessmentController.php`
- `app/Http/Controllers/Api/ChartController.php`
- `app/Http/Controllers/Api/AnalyticsController.php`
- `app/Http/Controllers/Api/LeaveRequestController.php`
- `app/Http/Controllers/Api/BaseApiController.php` (added helper method)
- `app/Models/Branch.php` (added cache invalidation)
- `app/Services/DashboardService.php` (already optimized)

