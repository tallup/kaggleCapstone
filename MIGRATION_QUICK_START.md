# Quick Start: Migrate to MySQL

## Option 1: Automated Script (Easiest)

I've created an interactive script that guides you through the migration:

```bash
./migrate-to-mysql.sh
```

The script will:
1. ✅ Backup your SQLite database
2. ✅ Create MySQL database and user
3. ✅ Update your .env file
4. ✅ Test the connection
5. ✅ Run migrations
6. ✅ Verify indexes
7. ✅ Rebuild caches

**Just run it and follow the prompts!**

## Option 2: Manual Steps (If you prefer)

### Quick Commands

```bash
# 1. Backup
cp database/database.sqlite database/database.sqlite.backup

# 2. Create MySQL database (run in MySQL)
mysql -u root -p
# Then:
CREATE DATABASE evergreen_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'evergreen_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON evergreen_production.* TO 'evergreen_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 3. Update .env
# Edit .env and change:
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=evergreen_production
DB_USERNAME=evergreen_user
DB_PASSWORD=your_password

# 4. Clear cache and migrate
php artisan config:clear
php artisan migrate

# 5. Verify
php artisan tinker --execute="DB::connection()->getPdo(); echo 'Connected!';"
```

## What You Need

- ✅ MySQL installed (you have it: MySQL 8.0.44)
- ✅ PHP MySQL extension (you have it: pdo_mysql)
- ✅ MySQL root password (or access)

## After Migration

1. **Test the app**: `php artisan serve` and login
2. **Verify performance**: Check that queries are faster
3. **Check indexes**: `SHOW INDEXES FROM branches;`

## Need Help?

- See `MIGRATE_TO_MYSQL.md` for detailed guide
- See `docs/DATABASE_MIGRATION_GUIDE.md` for comprehensive documentation

## Rollback

If something goes wrong:

```bash
# Restore .env backup
cp .env.backup.* .env

# Restore SQLite database
cp database/database.sqlite.backup.* database/database.sqlite

# Clear cache
php artisan config:clear
```

