# Database Migration Guide: SQLite to MySQL/PostgreSQL

This guide provides step-by-step instructions for migrating from SQLite to MySQL or PostgreSQL for production deployment.

## Overview

SQLite is suitable for development but has limitations for production multi-tenant applications:
- Concurrency limitations (single writer)
- Write contention issues
- Not suitable for high-traffic scenarios

MySQL or PostgreSQL are recommended for production environments with 50+ facilities.

## Prerequisites

- MySQL 8.0+ or PostgreSQL 13+
- Database server configured and accessible
- Backup of existing SQLite database
- Access to application server and database

## Step 1: Backup Current Database

### Backup SQLite Database

```bash
# Create backup of SQLite database
cp database/database.sqlite database/database.sqlite.backup

# Or use SQLite dump
sqlite3 database/database.sqlite .dump > database_backup.sql
```

## Step 2: Install Database Drivers

### For MySQL/MariaDB

```bash
# Install PHP MySQL extension
sudo apt-get install php-mysql  # Ubuntu/Debian
# or
sudo yum install php-mysql      # CentOS/RHEL
```

### For PostgreSQL

```bash
# Install PHP PostgreSQL extension
sudo apt-get install php-pgsql  # Ubuntu/Debian
# or
sudo yum install php-pgsql      # CentOS/RHEL
```

## Step 3: Create Production Database

### MySQL/MariaDB

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE evergreen_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace with your credentials)
CREATE USER 'evergreen_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON evergreen_production.* TO 'evergreen_user'@'localhost';
FLUSH PRIVILEGES;
```

### PostgreSQL

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database
CREATE DATABASE evergreen_production ENCODING 'UTF8';

-- Create user (replace with your credentials)
CREATE USER evergreen_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE evergreen_production TO evergreen_user;
```

## Step 4: Update Environment Configuration

Update your `.env` file:

### MySQL Configuration

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=evergreen_production
DB_USERNAME=evergreen_user
DB_PASSWORD=secure_password
```

### PostgreSQL Configuration

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=evergreen_production
DB_USERNAME=evergreen_user
DB_PASSWORD=secure_password
```

## Step 5: Run Migrations

```bash
# Clear config cache
php artisan config:clear

# Run migrations (this will create all tables)
php artisan migrate

# Run migrations with fresh database (if starting fresh)
# WARNING: This will drop all tables
php artisan migrate:fresh
```

## Step 6: Import Data from SQLite (Optional)

If you need to migrate existing data:

### Option 1: Use Laravel Tinker

```php
// This is a basic example - you may need to customize based on your data
php artisan tinker

// Copy data table by table
DB::connection('sqlite')->table('users')->get()->each(function($user) {
    DB::connection('mysql')->table('users')->insert((array) $user);
});
```

### Option 2: Export/Import SQL

```bash
# Export from SQLite
sqlite3 database/database.sqlite .dump > export.sql

# Convert SQLite syntax to MySQL (manual editing required for some differences)
# Then import to MySQL
mysql -u evergreen_user -p evergreen_production < export.sql
```

### Option 3: Use Migration Tool

Consider using a tool like `sqlite3-to-mysql` or `pgloader` for automated conversion.

## Step 7: Verify Indexes

After migration, verify that all indexes are created:

### MySQL

```sql
-- Check branches table indexes
SHOW INDEXES FROM branches;

-- Should show:
-- - branches_facility_id_index
-- - branches_facility_id_is_active_index
```

### PostgreSQL

```sql
-- Check branches table indexes
\d+ branches

-- Should show indexes including:
-- - branches_facility_id_index
-- - branches_facility_id_is_active_index
```

## Step 8: Test Application

1. **Verify Connections**: Test database connectivity
   ```bash
   php artisan tinker
   DB::connection()->getPdo();
   ```

2. **Test Queries**: Run a few test queries to ensure data integrity
   ```php
   \App\Models\Facility::count();
   \App\Models\Branch::count();
   \App\Models\Resident::count();
   ```

3. **Test Application**: Test key functionality:
   - User login
   - Dashboard loading
   - Facility filtering
   - Branch/resident queries

## Step 9: Optimize Database Configuration

### MySQL Optimization

Add to `/etc/mysql/my.cnf` or MySQL configuration:

```ini
[mysqld]
# Connection settings
max_connections = 200

# InnoDB settings (adjust based on server RAM)
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2

# Query cache (MySQL 5.7 and below)
query_cache_type = 1
query_cache_size = 64M

# Performance schema
performance_schema = ON
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

### PostgreSQL Optimization

Add to `/etc/postgresql/13/main/postgresql.conf`:

```ini
# Connection settings
max_connections = 200

# Memory settings (adjust based on server RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB

# Write-ahead log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Step 10: Performance Testing

After migration, test query performance:

### Check Query Execution Plans

**MySQL:**
```sql
EXPLAIN SELECT * FROM branches WHERE facility_id = 1;
```

**PostgreSQL:**
```sql
EXPLAIN ANALYZE SELECT * FROM branches WHERE facility_id = 1;
```

Look for:
- `Using index` in MySQL (indicates index is being used)
- `Index Scan` in PostgreSQL (indicates index is being used)

### Monitor Performance

1. Enable slow query log in MySQL:
   ```ini
   slow_query_log = 1
   long_query_time = 1
   ```

2. Use Laravel Telescope or Debugbar to monitor queries

3. Monitor database connections and performance metrics

## Rollback Procedure

If you need to rollback:

1. Update `.env` to point back to SQLite
2. Restore SQLite backup:
   ```bash
   cp database/database.sqlite.backup database/database.sqlite
   ```
3. Clear config cache:
   ```bash
   php artisan config:clear
   ```

## Troubleshooting

### Common Issues

1. **Character Encoding Issues**
   - Ensure database uses `utf8mb4` (MySQL) or `UTF8` (PostgreSQL)
   - Check connection charset in `config/database.php`

2. **Foreign Key Constraints**
   - Verify foreign keys are properly migrated
   - Check that `DB_FOREIGN_KEYS=true` in `.env`

3. **Index Creation Failures**
   - Run migrations one at a time to identify issues
   - Check database user permissions
   - Verify table structure matches expectations

4. **Performance Issues**
   - Verify indexes are created (see Step 7)
   - Check database configuration
   - Monitor slow queries

## Post-Migration Checklist

- [ ] All migrations run successfully
- [ ] All indexes created and verified
- [ ] Data integrity verified
- [ ] Application functionality tested
- [ ] Database performance optimized
- [ ] Slow query log enabled (if applicable)
- [ ] Backup strategy in place
- [ ] Monitoring set up

## Additional Resources

- [Laravel Database Documentation](https://laravel.com/docs/database)
- [MySQL Optimization Guide](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

