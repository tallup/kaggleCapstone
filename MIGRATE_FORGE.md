# Migrate to MySQL on Laravel Forge

## Important: Forge Already Has MySQL!

On Laravel Forge, MySQL is **already installed and configured**. You don't need to create the database - Forge does that for you. You just need to:

1. ✅ Update your `.env` file with Forge's database credentials
2. ✅ Run migrations
3. ✅ Verify everything works

## Step-by-Step Guide

### Step 1: Get Your Database Credentials from Forge

1. Go to your Laravel Forge dashboard
2. Click on your site
3. Go to **"Database"** tab
4. You'll see:
   - Database name (e.g., `forge`)
   - Username (usually `forge`)
   - Password (click "Show" to reveal it)
   - Host (usually `127.0.0.1`)

### Step 2: Update Your .env File in Forge

In your Forge site, go to **"Environment"** tab and update these values:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=forge
DB_USERNAME=forge
DB_PASSWORD=your_forge_password_here
```

**Important**: Replace `your_forge_password_here` with the actual password from Step 1.

### Step 3: Run Migrations via Forge

You have two options:

#### Option A: Via Forge Commands Tab (Recommended)

1. Go to your site in Forge
2. Click **"Commands"** tab
3. Run these commands one by one:

```bash
# Clear config cache
php artisan config:clear

# Run migrations
php artisan migrate --force

# Verify migrations
php artisan migrate:status
```

#### Option B: Via SSH

1. SSH into your Forge server
2. Navigate to your site directory:
   ```bash
   cd /home/forge/your-domain.com
   ```
3. Run the same commands as above

### Step 4: Verify Indexes Were Created

Run this command in Forge's Commands tab:

```bash
php artisan tinker --execute="
\$indexes = DB::select('SHOW INDEXES FROM branches WHERE Key_name LIKE \"%facility_id%\"');
foreach (\$indexes as \$index) {
    echo \$index->Key_name . PHP_EOL;
}
"
```

You should see:
- `branches_facility_id_index`
- `branches_facility_id_is_active_index`

### Step 5: Rebuild Caches

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### Step 6: Test Your Application

1. Visit your site URL
2. Try logging in
3. Check that the dashboard loads
4. Verify facility filtering works

## Quick One-Liner Commands for Forge

Copy and paste these into Forge's Commands tab:

```bash
# Full migration (run all at once)
php artisan config:clear && php artisan migrate --force && php artisan optimize
```

## Troubleshooting

### Error: "Access denied for user 'forge'@'localhost'"

**Solution**: 
- Double-check the password in your `.env` file
- Make sure you copied it exactly from Forge's Database tab
- Passwords are case-sensitive

### Error: "Unknown database 'forge'"

**Solution**:
- Check the database name in Forge's Database tab
- It might be named differently (e.g., `your_site_name`)
- Update `DB_DATABASE` in `.env` to match

### Error: "Table already exists"

**Solution**:
- This means some migrations already ran
- Check which migrations ran: `php artisan migrate:status`
- If you need to start fresh (⚠️ **WARNING: Deletes all data**):
  ```bash
  php artisan migrate:fresh --force
  ```

### Error: "SQLSTATE[HY000] [2002] Connection refused"

**Solution**:
- Check that `DB_HOST=127.0.0.1` (not `localhost`)
- Verify MySQL is running on Forge
- Contact Forge support if MySQL service is down

## What's Different on Forge?

| Local Development | Laravel Forge |
|-------------------|---------------|
| Need to install MySQL | ✅ Already installed |
| Need to create database | ✅ Already created |
| Need to create user | ✅ Already created |
| Use root password | ❌ Use Forge credentials |
| SQLite database exists | ❌ No SQLite on Forge |

## After Migration Checklist

- [ ] `.env` updated with Forge database credentials
- [ ] Config cache cleared
- [ ] All migrations ran successfully
- [ ] Indexes verified
- [ ] Caches rebuilt
- [ ] Application tested
- [ ] Login works
- [ ] Dashboard loads correctly

## Need Help?

If you're still having issues:

1. **Check Forge Logs**: Go to your site → "Logs" tab
2. **Check Laravel Logs**: `storage/logs/laravel.log`
3. **Test Connection**: 
   ```bash
   php artisan tinker --execute="DB::connection()->getPdo(); echo 'Connected!';"
   ```

## Next Steps

After successful migration:

1. ✅ Your app is now using MySQL (much better for 50+ facilities!)
2. ✅ All performance indexes are in place
3. ✅ Ready for production traffic

You're all set! 🎉

