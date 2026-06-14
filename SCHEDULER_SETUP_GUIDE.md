# Laravel Scheduler Setup Guide for Production

## Overview
The Laravel scheduler needs a cron job to run `php artisan schedule:run` every minute. This ensures all scheduled tasks (notifications, reminders, missed medications, etc.) run automatically.

## Setup Instructions for Laravel Forge

### Step 1: Access Laravel Forge Dashboard
1. Login to [Laravel Forge](https://forge.laravel.com)
2. Select your server
3. Click on your site (e.g., `homelogic360.net`)

### Step 2: Configure Cron Job
1. Navigate to the **"Cron Jobs"** tab in your Forge site
2. Click **"New Cron Job"** or **"Add Cron Job"**
3. Fill in the following details:
   - **Command**: `php artisan schedule:run`
   - **User**: `forge`
   - **Directory**: `/home/forge/homelogic360.net` (or your actual site path)
   - **Frequency**: `* * * * *` (runs every minute)

### Step 3: Verify the Cron Job
After adding the cron job, verify it's working:

#### Option A: Check via Forge Dashboard
1. Go to "Cron Jobs" tab
2. You should see the cron job listed
3. Check the "Last Run" timestamp - it should update every minute

#### Option B: SSH into Server and Check
```bash
# SSH into your Forge server
ssh forge@your-server-ip

# Check if cron job exists
crontab -l | grep schedule:run

# You should see:
# * * * * * cd /home/forge/homelogic360.net && php artisan schedule:run >> /dev/null 2>&1
```

#### Option C: Test Manually
```bash
# SSH into your server
ssh forge@your-server-ip

# Navigate to your site directory
cd /home/forge/homelogic360.net

# Run the scheduler manually
php artisan schedule:run

# You should see output indicating which commands ran (if any were due)
```

## What Gets Scheduled

Based on `routes/console.php`, the following tasks are scheduled:

1. **Notifications**: Every hour (`notifications:generate`)
2. **Reminders**: 
   - Generate events: Every 30 minutes (`reminders:generate`)
   - Dispatch reminders: Every 5 minutes (`reminders:dispatch`)
3. **Missed Medications**:
   - Real-time check: Every 30 minutes (`medications:mark-missed`)
   - End-of-day check: Daily at 11:55 PM (`medications:mark-missed --end-of-day`)

## Verification Script

Run this script on your production server to verify everything is working:

```bash
bash verify-scheduler.sh
```

Or manually check:

```bash
# Test missed medications marking
php artisan medications:mark-missed

# Test notification generation
php artisan notifications:generate

# Check scheduler list
php artisan schedule:list
```

## Troubleshooting

### Cron Job Not Running
1. **Check cron service**: `sudo service cron status` (should be running)
2. **Check cron logs**: `grep CRON /var/log/syslog` (Linux) or check Forge logs
3. **Verify permissions**: Ensure the `forge` user has execute permissions
4. **Check directory**: Verify the directory path in the cron job is correct

### Scheduled Tasks Not Executing
1. **Verify cron job exists**: `crontab -l | grep schedule:run`
2. **Check Laravel logs**: `tail -f storage/logs/laravel.log`
3. **Test manually**: Run `php artisan schedule:run` and check output
4. **Check timezone**: Ensure `APP_TIMEZONE` in `.env` is set correctly

### Missed Medications Not Being Marked
1. **Check if command runs**: `php artisan medications:mark-missed`
2. **Check logs**: Look for errors in `storage/logs/laravel.log`
3. **Verify medications exist**: Check that active medications with scheduled times exist
4. **Check timezone**: Ensure server timezone matches application timezone

## Monitoring

### Check Scheduler Status
```bash
# List all scheduled tasks
php artisan schedule:list

# This shows:
# - Task name
# - Next run time
# - Description
# - Cron expression
```

### Monitor Logs
```bash
# Watch Laravel logs in real-time
tail -f storage/logs/laravel.log | grep -i "schedule\|medication\|missed"

# Check cron execution logs
grep CRON /var/log/syslog | grep schedule:run
```

## Important Notes

1. **The cron job must run every minute** (`* * * * *`) - this is how Laravel's scheduler works
2. **The scheduler itself is smart** - it only runs commands when they're due, so running every minute is safe
3. **Forge automatically manages the cron** - once set up, it will persist across deployments
4. **If you change scheduled tasks** in `routes/console.php`, you don't need to modify the cron job - it will automatically pick up changes

## Alternative: Manual Cron Setup (Non-Forge)

If you're not using Laravel Forge, add this to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add this line (replace path with your actual application path)
* * * * * cd /path/to/your/application && php artisan schedule:run >> /dev/null 2>&1
```

## Testing After Setup

1. **Wait 30 minutes** and check if missed medications are being marked
2. **Check medication history** - you should see "missed" status appearing automatically
3. **Check notifications** - they should generate hourly
4. **Check reminders** - they should generate every 30 minutes

If everything is working, you'll see missed medications appearing in the Medication History page automatically without manual intervention.

