# Notification Setup Guide

## Problem
Notifications are working on local development but not on production.

## Root Cause
The Laravel scheduler needs to be configured on production. The command `php artisan notifications:generate` is scheduled to run every hour, but the scheduler itself needs a cron job to trigger it.

## Solution

### For Production (Laravel Forge)

1. **Login to Laravel Forge** dashboard
2. **Go to your site**: `evergreen-gpga9dpd.on-forge.com`
3. **Navigate to "Cron Jobs"** tab
4. **Add a new cron job** with these settings:
   - **Command**: `php artisan schedule:run`
   - **User**: `forge`
   - **Directory**: `/home/forge/evergreen-gpga9dpd.on-forge.com` (or your actual path)
   - **Frequency**: `* * * * *` (runs every minute)

### Why Every Minute?
The Laravel scheduler runs the `schedule:run` command every minute, but internally it only executes scheduled tasks when they're due. Since we've set notifications to run hourly, the scheduler will only run the notification generation command once per hour, even though the scheduler itself runs every minute.

## Verification

After setting up the cron job, verify it's working:

```bash
# On the production server via SSH
bash fix-production-notifications.sh
```

Or manually test:

```bash
# Test the notification generation
php artisan notifications:generate

# Check recent notifications
php artisan tinker --execute="echo App\Models\Notification::latest()->limit(5)->count();"
```

## How It Works

1. **Every minute**: Cron runs `php artisan schedule:run`
2. **The scheduler checks**: `routes/console.php` line 12: `Schedule::command('notifications:generate')->hourly();`
3. **When due**: Runs `php artisan notifications:generate`
4. **The command**:
   - Finds appointments in the next 7 days
   - Finds medications due today
   - Creates notifications for assigned caregivers (or admins if no caregivers assigned)

## Common Issues

### No Notifications Generated
- **No appointments in next 7 days**: Notifications are only created for upcoming appointments
- **No medications due**: Check that medications exist and have scheduled times
- **All appointments already have notifications**: Duplicates are prevented

### Notifications Show on Local But Not Production
- **Cron job not configured**: This is the most common issue
- **Different data**: Production might not have appointments/medications in the correct date range
- **Cache issues**: Run `php artisan config:clear` on production

## Manual Testing

To manually generate notifications for testing:

```bash
php artisan notifications:generate
```

Check the output - it will tell you how many notifications were created.

## Important Notes

- Notifications are only created for appointments within the next 7 days
- Duplicate notifications are prevented within 24 hours
- If no caregivers are assigned to a resident, admins/managers receive the notification instead
- Notifications auto-refresh in the UI every 30 seconds

