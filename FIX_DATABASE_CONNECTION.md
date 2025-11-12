# Fixing "Connection Refused" Database Error

This guide will help you resolve the `PDOException: SQLSTATE[HY000][2002] Connection refused` error on your Laravel Forge server.

## Quick Diagnosis

Run the diagnostic script on your Forge server:

```bash
cd /home/forge/evergreen-gpga9dpd.on-forge.com/current
bash diagnose-db-connection.sh
```

Or if you're in a different directory:

```bash
bash diagnose-db-connection.sh /home/forge/evergreen-gpga9dpd.on-forge.com/current
```

## Common Causes and Solutions

### 1. MySQL Service Not Running

**Check if MySQL is running:**
```bash
sudo systemctl status mysql
# or
sudo systemctl status mariadb
```

**Start MySQL if it's stopped:**
```bash
sudo systemctl start mysql
# or
sudo systemctl start mariadb
```

**Enable MySQL to start on boot:**
```bash
sudo systemctl enable mysql
```

### 2. Incorrect Database Credentials

**Verify your `.env` file has correct credentials:**

1. SSH into your Forge server
2. Navigate to your site's current directory:
   ```bash
   cd /home/forge/evergreen-gpga9dpd.on-forge.com/current
   ```
3. Check your database configuration:
   ```bash
   grep -E "^(DB_CONNECTION|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD)" .env
   ```

**Common Forge database settings:**
- `DB_CONNECTION=mysql`
- `DB_HOST=127.0.0.1` (or `localhost`)
- `DB_PORT=3306`
- `DB_DATABASE=your_database_name`
- `DB_USERNAME=forge` (or your database user)
- `DB_PASSWORD=your_database_password`

**Update credentials in Forge:**
1. Go to your Forge dashboard
2. Navigate to your site
3. Click on "Environment" in the sidebar
4. Update the database credentials
5. Save and redeploy

### 3. Database Doesn't Exist

**Check if the database exists:**
```bash
mysql -u forge -p -e "SHOW DATABASES;"
```

**Create the database if it doesn't exist:**
```bash
mysql -u forge -p -e "CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**Grant permissions to the user:**
```bash
mysql -u root -p -e "GRANT ALL PRIVILEGES ON your_database_name.* TO 'forge'@'localhost'; FLUSH PRIVILEGES;"
```

### 4. MySQL Bind Address Configuration

**Check MySQL bind address:**
```bash
sudo grep bind-address /etc/mysql/my.cnf
# or
sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf
```

**If bind-address is set to 127.0.0.1, it should work. If it's set to a different IP, you may need to:**
1. Edit the MySQL config file:
   ```bash
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
   ```
2. Ensure `bind-address = 127.0.0.1` (or `0.0.0.0` for all interfaces)
3. Restart MySQL:
   ```bash
   sudo systemctl restart mysql
   ```

### 5. Using Unix Socket Instead of TCP

If you're using `localhost` or `127.0.0.1`, you might need to specify the MySQL socket:

**Find the MySQL socket:**
```bash
sudo find /var -name "mysql.sock" 2>/dev/null
# or
sudo find /tmp -name "mysql.sock" 2>/dev/null
```

**Add to your `.env` file:**
```env
DB_SOCKET=/var/run/mysqld/mysqld.sock
```

### 6. Clear Laravel Configuration Cache

After updating your `.env` file, clear Laravel's config cache:

```bash
cd /home/forge/evergreen-gpga9dpd.on-forge.com/current
php artisan config:clear
php artisan cache:clear
```

### 7. Test Database Connection

**Test from command line:**
```bash
mysql -h 127.0.0.1 -u forge -p your_database_name
```

**Test from Laravel:**
```bash
cd /home/forge/evergreen-gpga9dpd.on-forge.com/current
php artisan tinker
```

Then in tinker:
```php
DB::connection()->getPdo();
```

If successful, you should see connection details. If it fails, you'll see the error message.

## Step-by-Step Fix Process

1. **SSH into your Forge server**
   ```bash
   ssh forge@your-server-ip
   ```

2. **Navigate to your site directory**
   ```bash
   cd /home/forge/evergreen-gpga9dpd.on-forge.com/current
   ```

3. **Run the diagnostic script**
   ```bash
   bash diagnose-db-connection.sh
   ```

4. **Check MySQL service status**
   ```bash
   sudo systemctl status mysql
   ```

5. **Verify .env configuration**
   ```bash
   cat .env | grep DB_
   ```

6. **Test MySQL connection**
   ```bash
   mysql -h 127.0.0.1 -u forge -p
   ```

7. **Clear Laravel cache**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

8. **Test Laravel database connection**
   ```bash
   php artisan tinker --execute="DB::connection()->getPdo();"
   ```

## Still Having Issues?

If you're still experiencing connection issues:

1. **Check MySQL error logs:**
   ```bash
   sudo tail -50 /var/log/mysql/error.log
   ```

2. **Check Laravel logs:**
   ```bash
   tail -50 storage/logs/laravel.log
   ```

3. **Verify user permissions:**
   ```bash
   mysql -u root -p -e "SELECT User, Host FROM mysql.user WHERE User='forge';"
   ```

4. **Check firewall rules** (if applicable):
   ```bash
   sudo ufw status
   ```

## Forge-Specific Notes

- Laravel Forge typically uses `forge` as the database username
- The database host is usually `127.0.0.1` for local connections
- You can manage databases through the Forge dashboard under "Databases"
- Environment variables are managed in the Forge dashboard under "Environment"

## Need Help?

If none of these solutions work, check:
- MySQL error logs: `/var/log/mysql/error.log`
- Laravel application logs: `storage/logs/laravel.log`
- Nginx error logs: `/var/log/nginx/error.log`

Share the relevant error messages for further assistance.

