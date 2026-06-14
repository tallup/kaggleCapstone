# Commands to Run in Laravel Forge

## Your Current Setup ✅

Your `.env` is already configured for MySQL:
- ✅ `DB_CONNECTION=mysql`
- ✅ `DB_DATABASE=Homelogic`
- ✅ `DB_USERNAME=homelogic`
- ✅ `DB_PASSWORD=homelogic`

## Step 1: Run Migrations

Go to your Forge site → **Commands** tab and run these commands **one at a time**:

### Command 1: Clear Config Cache
```bash
php artisan config:clear
```

### Command 2: Run Migrations
```bash
php artisan migrate --force
```

### Command 3: Verify Migrations
```bash
php artisan migrate:status
```

### Command 4: Verify Indexes Were Created
```bash
php artisan tinker --execute="
\$indexes = DB::select(\"SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%'\");
if (count(\$indexes) > 0) {
    echo '✅ Indexes found:' . PHP_EOL;
    foreach (\$indexes as \$index) {
        echo '   - ' . \$index->Key_name . PHP_EOL;
    }
} else {
    echo '⚠️  No indexes found yet';
}
"
```

### Command 5: Rebuild Caches
```bash
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan optimize
```

### Command 6: Test Database Connection
```bash
php artisan tinker --execute="
try {
    echo '✅ Connected to MySQL!' . PHP_EOL;
    echo 'Database: ' . config('database.connections.mysql.database') . PHP_EOL;
    echo 'Facilities: ' . \App\Models\Facility::count() . PHP_EOL;
    echo 'Branches: ' . \App\Models\Branch::count() . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage();
}
"
```

## All-in-One Command (Optional)

If you want to run everything at once:

```bash
php artisan config:clear && php artisan migrate --force && php artisan optimize
```

## Optional: Switch to Redis (Recommended for Production)

Your current setup uses `database` for cache and queue. For better performance with 50+ facilities, consider switching to Redis:

1. **Update Environment** (in Forge → Environment tab):
   ```env
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   ```

2. **Make sure Redis is installed** (Forge usually has it by default)

3. **Clear and rebuild caches**:
   ```bash
   php artisan config:clear
   php artisan config:cache
   ```

## Troubleshooting

### If migrations fail:
- Check the error message
- Verify database credentials are correct
- Make sure the database `Homelogic` exists

### If you see "Table already exists":
- Some migrations may have already run
- Check status: `php artisan migrate:status`
- If needed, you can run: `php artisan migrate:fresh --force` (⚠️ **WARNING: This deletes all data!**)

## After Migration

✅ Your app will be:
- Using MySQL (much better for 50+ facilities!)
- All performance indexes in place
- Ready for production traffic

Test your application to make sure everything works!

