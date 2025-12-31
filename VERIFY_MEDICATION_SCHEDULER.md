# Medication Scheduler Verification Guide

## Issue: Medications Not Being Automatically Marked as Missed

The command `medications:mark-missed` is working correctly when run manually, but it's not running automatically via the scheduler.

## Quick Verification Steps

### 1. Test the Command Manually
```bash
php artisan medications:mark-missed
```
This should mark missed medications. If it works, the command is fine.

### 2. Check Scheduler Configuration
```bash
php artisan schedule:list | grep medication
```
You should see:
- `medications:mark-missed` running every 30 minutes
- `medications:mark-missed --end-of-day` running daily at 11:55 PM

### 3. Verify Cron Job is Running

#### On Laravel Forge:
1. Go to your Forge dashboard
2. Select your site
3. Go to "Cron Jobs" tab
4. Verify there's a cron job: `* * * * * cd /path/to/site && php artisan schedule:run >> /dev/null 2>&1`
5. Check the "Last Run" timestamp - it should update every minute

#### Via SSH:
```bash
# Check if cron job exists
crontab -l | grep schedule:run

# You should see something like:
# * * * * * cd /home/forge/homelogic360.net && php artisan schedule:run >> /dev/null 2>&1
```

### 4. Test Scheduler Manually
```bash
php artisan schedule:run
```
This will run all due scheduled tasks immediately. Check the output to see if medications are being marked.

### 5. Check Laravel Logs
```bash
tail -f storage/logs/laravel.log | grep -i "medication\|missed\|schedule"
```
Look for errors or confirmation messages.

### 6. Run Diagnostic Script
```bash
php check-medication-scheduler.php
```
This will show:
- Active medications count
- Medications that should be marked as missed
- Recent missed medications

## Common Issues and Fixes

### Issue 1: Cron Job Not Set Up
**Symptom:** `crontab -l` shows no `schedule:run` entry

**Fix:**
1. On Forge: Add a new cron job in the dashboard
2. Manually: Add to crontab:
   ```bash
   crontab -e
   # Add this line:
   * * * * * cd /path/to/your/site && php artisan schedule:run >> /dev/null 2>&1
   ```

### Issue 2: Cron Job Running But Scheduler Not Executing
**Symptom:** Cron job exists but tasks don't run

**Fix:**
1. Check file permissions:
   ```bash
   ls -la artisan
   chmod +x artisan
   ```
2. Check PHP path in cron:
   ```bash
   which php
   # Use full path in cron: /usr/bin/php instead of just php
   ```
3. Check Laravel logs for errors

### Issue 3: Timezone Mismatch
**Symptom:** Medications marked at wrong times

**Fix:**
1. Check `.env` file:
   ```
   APP_TIMEZONE=America/Los_Angeles
   ```
2. Verify server timezone matches:
   ```bash
   date
   php -r "echo date_default_timezone_get();"
   ```

### Issue 4: Scheduler Running But Not Marking Medications
**Symptom:** Scheduler runs but no medications marked

**Possible Causes:**
1. All medications already have administrations or are already marked
2. Medications are not active (`is_active = false`)
3. Medications don't have scheduled times set
4. Date range issues (start_date/end_date)

**Check:**
```bash
# Check active medications
php artisan tinker
>>> App\Models\Medication::where('is_active', true)->count()
>>> App\Models\Medication::where('is_active', true)->whereNotNull('time_1')->count()
```

## Expected Behavior

- **Every 30 minutes:** The scheduler checks for medication windows that have closed (60 minutes after scheduled time) and marks them as missed
- **Daily at 11:55 PM:** An end-of-day check marks any missed medications from the entire day

## Monitoring

To monitor if it's working:
```bash
# Watch logs in real-time
tail -f storage/logs/laravel.log | grep -i "mark.*missed\|medication"

# Check recent missed medications
php artisan tinker
>>> App\Models\MedicationAdministration::where('status', 'missed')->where('administered_at', '>=', now()->subDay())->count()
```

## Force Run (For Testing)

To manually trigger the scheduler:
```bash
# Run all due tasks
php artisan schedule:run

# Run specific command
php artisan medications:mark-missed
php artisan medications:mark-missed --end-of-day
```


