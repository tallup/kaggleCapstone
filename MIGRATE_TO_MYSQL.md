# Step-by-Step Guide: Migrate from SQLite to MySQL

## Current Status
- ✅ MySQL is installed
- ✅ PHP MySQL extension is installed
- ✅ SQLite database exists (14MB)
- ✅ All migrations are ready

## Migration Steps

### Step 1: Backup Your SQLite Database

```bash
cd /home/taal/Documents/Evergreen

# Create backup
cp database/database.sqlite database/database.sqlite.backup

# Also create SQL dump (optional)
sqlite3 database/database.sqlite .dump > database_backup_$(date +%Y%m%d_%H%M%S).sql

echo "✅ Backup created"
```

### Step 2: Create MySQL Database

```bash
# Connect to MySQL (you'll be prompted for root password)
mysql -u root -p
```

Then run these SQL commands:

```sql
-- Create database
CREATE DATABASE evergreen_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_password' with a secure password)
CREATE USER 'evergreen_user'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON evergreen_production.* TO 'evergreen_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
EXIT;
```

### Step 3: Update .env File

Update your `.env` file with MySQL credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=evergreen_production
DB_USERNAME=evergreen_user
DB_PASSWORD=your_password
```

**Important**: Replace `your_password` with the password you set in Step 2.

### Step 4: Test MySQL Connection

```bash
# Clear config cache
php artisan config:clear

# Test connection
php artisan tinker --execute="try { DB::connection()->getPdo(); echo '✅ MySQL connection successful!'; } catch (\Exception \$e) { echo '❌ Connection failed: ' . \$e->getMessage(); }"
```

### Step 5: Run Migrations

```bash
# Run all migrations (this will create all tables in MySQL)
php artisan migrate

# Verify migrations ran
php artisan migrate:status | tail -10
```

### Step 6: Verify Indexes Were Created

```bash
# Connect to MySQL
mysql -u evergreen_user -p evergreen_production

# Check indexes
SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%';
```

You should see:
- `branches_facility_id_index`
- `branches_facility_id_is_active_index`

### Step 7: Import Existing Data (If Needed)

If you have important data in SQLite that you want to keep:

**Option A: Manual Import (Recommended for small datasets)**

```bash
php artisan tinker
```

Then in tinker:
```php
// Connect to both databases
$sqlite = DB::connection('sqlite');
$mysql = DB::connection('mysql');

// Example: Copy users (adjust as needed)
$users = $sqlite->table('users')->get();
foreach ($users as $user) {
    try {
        $mysql->table('users')->insert((array) $user);
    } catch (\Exception $e) {
        echo "Skipped user {$user->id}: " . $e->getMessage() . "\n";
    }
}

// Repeat for other tables: facilities, branches, residents, etc.
```

**Option B: Start Fresh (If you don't need existing data)**

Just run seeders:
```bash
php artisan db:seed
```

### Step 8: Test Application

```bash
# Test database queries
php artisan tinker --execute="
echo 'Facilities: ' . \App\Models\Facility::count() . PHP_EOL;
echo 'Branches: ' . \App\Models\Branch::count() . PHP_EOL;
echo 'Residents: ' . \App\Models\Resident::count() . PHP_EOL;
echo 'Users: ' . \App\Models\User::count() . PHP_EOL;
"

# Test application
# - Start server: php artisan serve
# - Login and test dashboard
# - Verify facility filtering works
```

### Step 9: Rebuild Caches

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### Step 10: Verify Performance

```bash
# Test query performance
mysql -u evergreen_user -p evergreen_production

# Run this query and check it uses the index
EXPLAIN SELECT * FROM branches WHERE facility_id = 1;
```

Look for `Using index` in the output - this means the index is being used.

## Quick Migration Script

Here's a complete script you can run:

```bash
#!/bin/bash
cd /home/taal/Documents/Evergreen

echo "📦 Step 1: Creating backup..."
cp database/database.sqlite database/database.sqlite.backup
echo "✅ Backup created"

echo "🔧 Step 2: Clearing config cache..."
php artisan config:clear

echo "📊 Step 3: Testing MySQL connection..."
php artisan tinker --execute="try { DB::connection()->getPdo(); echo '✅ Connected'; } catch (\Exception \$e) { echo '❌ ' . \$e->getMessage(); exit(1); }"

echo "🗄️ Step 4: Running migrations..."
php artisan migrate --force

echo "✅ Step 5: Verifying indexes..."
mysql -u evergreen_user -p evergreen_production -e "SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%';"

echo "⚡ Step 6: Rebuilding caches..."
php artisan optimize

echo "✅ Migration complete!"
```

## Troubleshooting

### Connection Issues

**Error: Access denied**
- Check username/password in `.env`
- Verify user has privileges: `SHOW GRANTS FOR 'evergreen_user'@'localhost';`

**Error: Unknown database**
- Make sure database was created: `SHOW DATABASES;`
- Check database name in `.env` matches

### Migration Issues

**Error: Table already exists**
- If starting fresh: `php artisan migrate:fresh` (WARNING: deletes all data)
- If keeping data: Check which migrations already ran

**Error: Foreign key constraint fails**
- Run migrations in order
- Check that parent tables exist before child tables

### Performance Issues

**Queries still slow**
- Verify indexes: `SHOW INDEXES FROM branches;`
- Check query execution: `EXPLAIN SELECT ...`
- Ensure MySQL is using indexes (look for `Using index`)

## Rollback (If Needed)

If something goes wrong:

```bash
# 1. Switch back to SQLite in .env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# 2. Restore backup
cp database/database.sqlite.backup database/database.sqlite

# 3. Clear cache
php artisan config:clear
```

## Post-Migration Checklist

- [ ] MySQL connection works
- [ ] All migrations ran successfully
- [ ] Indexes created and verified
- [ ] Application loads correctly
- [ ] Login works
- [ ] Dashboard loads
- [ ] Facility filtering works
- [ ] Queries use indexes (check with EXPLAIN)
- [ ] Performance is improved

## Next Steps After Migration

1. **Optimize MySQL** (see `docs/DATABASE_MIGRATION_GUIDE.md` Step 9)
2. **Enable slow query logging** (optional)
3. **Set up regular backups**
4. **Monitor performance**

## Need Help?

If you encounter issues:
1. Check the error message
2. Verify `.env` settings
3. Check MySQL user permissions
4. Review `docs/DATABASE_MIGRATION_GUIDE.md` for detailed troubleshooting

