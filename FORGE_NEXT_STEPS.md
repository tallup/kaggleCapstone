# Next Steps: Complete MySQL Migration on Forge

## ✅ Step 1 Complete: MySQL Connection Verified

Your MySQL connection is working! Now let's complete the migration.

## Step 2: Run Migrations

Go to Forge → **Commands** tab and run this command:

```bash
php artisan migrate --force
```

This will:
- Create all database tables
- Add all performance indexes
- Set up your database schema

**Expected output:** You should see a list of migrations running, like:
```
Migrating: 2025_10_26_000000_production_database_setup
Migrated:  2025_10_26_000000_production_database_setup
Migrating: 2025_12_21_013700_add_indexes_to_branches_table
Migrated:  2025_12_21_013700_add_indexes_to_branches_table
...
```

## Step 3: Verify Indexes Were Created

After migrations complete, verify the performance indexes:

```bash
php artisan tinker --execute="
\$indexes = DB::select(\"SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%'\");
if (count(\$indexes) > 0) {
    echo '✅ Performance indexes found:' . PHP_EOL;
    foreach (\$indexes as \$index) {
        echo '   - ' . \$index->Key_name . PHP_EOL;
    }
} else {
    echo '⚠️  No indexes found - migrations may not have run yet';
}
"
```

You should see:
- `branches_facility_id_index`
- `branches_facility_id_is_active_index`

## Step 4: Rebuild Caches

```bash
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan optimize
```

## Step 5: Test Your Application

1. Visit your site: `https://homelogic360.net`
2. Try logging in
3. Check that the dashboard loads
4. Verify facility filtering works

## Step 6: Verify Data (Optional)

Check that your models can query the database:

```bash
php artisan tinker --execute="
echo 'Facilities: ' . \App\Models\Facility::count() . PHP_EOL;
echo 'Branches: ' . \App\Models\Branch::count() . PHP_EOL;
echo 'Residents: ' . \App\Models\Resident::count() . PHP_EOL;
echo 'Users: ' . \App\Models\User::count() . PHP_EOL;
"
```

## Troubleshooting

### If migrations fail with "Table already exists":
- Some tables may already exist
- Check status: `php artisan migrate:status`
- If you need to start fresh (⚠️ **WARNING: Deletes all data**):
  ```bash
  php artisan migrate:fresh --force
  ```

### If you see "Access denied" errors:
- Double-check your database credentials in Forge → Environment
- Make sure `DB_DATABASE=Homelogic` matches your actual database name

### If indexes aren't created:
- Check migration status: `php artisan migrate:status`
- Look for the index migrations:
  - `2025_12_21_013700_add_indexes_to_branches_table`
  - `2025_12_21_013701_add_composite_indexes_for_performance`
- If they didn't run, run them specifically:
  ```bash
  php artisan migrate --path=database/migrations/2025_12_21_013700_add_indexes_to_branches_table.php
  ```

## All-in-One Command (If Everything Works)

If you want to do steps 2-4 in one go:

```bash
php artisan config:clear && php artisan migrate --force && php artisan optimize
```

## After Migration Complete ✅

Your app will be:
- ✅ Using MySQL (ready for 50+ facilities!)
- ✅ All performance indexes in place
- ✅ Optimized for production traffic
- ✅ Ready to scale!

## Optional: Switch to Redis (Recommended)

For even better performance, consider switching cache and queue to Redis:

1. In Forge → **Environment** tab, update:
   ```env
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   ```

2. Then run:
   ```bash
   php artisan config:clear && php artisan config:cache
   ```

---

**Ready?** Start with Step 2: Run `php artisan migrate --force` in Forge's Commands tab!

