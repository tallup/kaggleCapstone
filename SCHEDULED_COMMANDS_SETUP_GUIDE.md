# How to Make Scheduled Commands Work

## ✅ Current Status

Based on your Laravel Forge dashboard, the **Laravel Scheduler is already installed** and running every minute. This is the foundation that makes all scheduled commands work.

## 🔧 How It Works

### The Scheduler System

1. **Laravel Scheduler** (Already Installed)
   - Runs: `php artisan schedule:run` every minute
   - Location: Forge → Processes → Scheduler
   - Status: ✅ Installed (green checkmark)

2. **Scheduled Commands** (Defined in `routes/console.php`)
   - The scheduler checks these every minute
   - Only runs commands when they're due
   - All commands are already configured

## 📋 The Three Commands You Asked About

### 1. Medication Window Opening Notifications
**Command**: `medications:notify-window-opening`  
**Frequency**: Every 5 minutes  
**Status**: ✅ Already scheduled in `routes/console.php` line 26

**What it does**:
- Checks for medication administration windows opening within the next 5 minutes
- Sends emails to caregivers and admins 5 minutes before window opens
- Prevents duplicate notifications (caches for 2 hours)

**How to verify it's working**:
```bash
# SSH into your production server
ssh forge@your-server-ip

# Navigate to your site
cd /home/forge/homelogic360.net

# Test the command manually
php artisan medications:notify-window-opening

# Check logs for email sends
tail -f storage/logs/laravel.log | grep "Medication window opening email sent"
```

**Expected output**:
```
Checking for medication administration windows opening...
Notified 2 caregiver(s) and 1 admin(s) for medication ID 17 at 9:00 AM
Completed. Sent notifications for 1 medication windows.
```

---

### 2. Notification Generation
**Command**: `notifications:generate`  
**Frequency**: Every hour  
**Status**: ✅ Already scheduled in `routes/console.php` line 12

**What it does**:
- Creates in-app notifications for appointments in next 7 days
- Creates in-app notifications for medications due today
- Checks for late medications and vital signs
- Generates fire drill notifications

**How to verify it's working**:
```bash
# Test the command manually
php artisan notifications:generate

# Check if notifications were created
php artisan tinker --execute="echo 'Recent notifications: ' . \App\Models\Notification::where('created_at', '>=', now()->subHour())->count();"
```

**Expected output**:
```
Generating notifications...
Created 5 appointment notifications
Created 12 medication notifications
Created 2 fire drill notifications
Notification generation complete!
```

---

### 3. Reminder Dispatch
**Command**: `reminders:dispatch`  
**Frequency**: Every 5 minutes  
**Status**: ✅ Already scheduled in `routes/console.php` line 16

**What it does**:
- Finds reminder events that are due (scheduled_for <= now)
- Dispatches them as in-app notifications
- Marks events as 'delivered'
- Can be extended to send emails

**How to verify it's working**:
```bash
# Test the command manually
php artisan reminders:dispatch

# Check reminder events
php artisan tinker --execute="echo 'Due reminders: ' . \App\Models\ReminderEvent::where('status', 'pending')->where('scheduled_for', '<=', now())->count();"
```

**Expected output**:
```
Dispatching 3 reminder events
```

---

## 🚀 Making Them Work (Step-by-Step)

### Step 1: Verify Scheduler is Running

In Laravel Forge:
1. Go to **Processes** → **Scheduler**
2. Verify "Laravel Scheduler" shows:
   - ✅ Status: **Installed** (green checkmark)
   - Frequency: **Every minute**
   - Command: `cd /home/forge/homelogic360.net && php artisan schedule:run`

**If it's NOT installed**:
1. Click **"+ Add scheduled job"**
2. Set:
   - **Command**: `cd /home/forge/homelogic360.net && php artisan schedule:run`
   - **User**: `forge`
   - **Frequency**: `* * * * *` (every minute)

### Step 2: Test Commands Manually

SSH into your server and test each command:

```bash
# Connect to server
ssh forge@your-server-ip

# Navigate to site directory
cd /home/forge/homelogic360.net

# Test medication window notifications
php artisan medications:notify-window-opening

# Test notification generation
php artisan notifications:generate

# Test reminder dispatch
php artisan reminders:dispatch
```

### Step 3: Check Scheduler Execution

```bash
# Run the scheduler manually to see what executes
php artisan schedule:run

# You'll see output like:
# Running scheduled command: notifications:generate
# Running scheduled command: medications:notify-window-opening
# (Only shows commands that are due)
```

### Step 4: Monitor Logs

```bash
# Watch logs in real-time
tail -f storage/logs/laravel.log

# Filter for specific commands
tail -f storage/logs/laravel.log | grep "medications:notify-window-opening"
tail -f storage/logs/laravel.log | grep "notifications:generate"
tail -f storage/logs/laravel.log | grep "reminders:dispatch"
```

---

## 🔍 Troubleshooting

### Issue: Commands Not Running

**Check 1: Scheduler is installed**
- Go to Forge → Processes → Scheduler
- Verify "Laravel Scheduler" exists and is "Installed"

**Check 2: Commands are defined**
```bash
# Verify routes/console.php has the schedules
cat routes/console.php | grep "Schedule::command"
```

**Check 3: Test scheduler manually**
```bash
php artisan schedule:run -v
# The -v flag shows verbose output
```

**Check 4: Check for errors**
```bash
# Check Laravel logs
tail -100 storage/logs/laravel.log

# Check system logs
journalctl -u cron -n 50
```

### Issue: Emails Not Sending

**Check 1: Mail configuration**
```bash
# Check mail driver
php artisan tinker --execute="echo config('mail.default');"

# Should be: ses, ses-v2, smtp, or log
```

**Check 2: Email preferences**
```bash
# Check if user has email preferences disabled
php artisan tinker --execute="
\$user = \App\Models\User::find(1);
\$pref = \App\Services\EmailPreferenceService::class;
echo 'Should send: ' . (new \$pref)->shouldSendEmail(\$user, 'medication_window_opening');
"
```

**Check 3: Facility mail settings**
- Check if facility has mail configured in admin panel
- Verify AWS SES credentials in `.env`

### Issue: "We were unable to run a custom command" Error

This error in Forge usually means:
1. **Path issue**: The command path might be wrong
   - Fix: Ensure scheduler command uses correct directory: `cd /home/forge/homelogic360.net && php artisan schedule:run`

2. **Permissions issue**: The forge user might not have permissions
   - Fix: Ensure user is set to `forge` in scheduler settings

3. **PHP path issue**: PHP might not be in PATH
   - Fix: Use full path: `/usr/bin/php artisan schedule:run`

---

## 📊 Monitoring Commands

### View Scheduled Commands List
```bash
php artisan schedule:list
```

**Output example**:
```
* * * * *  php artisan schedule:run  Next Due: 0 minutes from now
*/5 * * * *  php artisan medications:notify-window-opening  Next Due: 3 minutes from now
0 * * * *  php artisan notifications:generate  Next Due: 45 minutes from now
*/5 * * * *  php artisan reminders:dispatch  Next Due: 2 minutes from now
```

### Check Last Execution Times
```bash
# Check when commands last ran (via logs)
grep "medications:notify-window-opening" storage/logs/laravel.log | tail -5
grep "notifications:generate" storage/logs/laravel.log | tail -5
grep "reminders:dispatch" storage/logs/laravel.log | tail -5
```

---

## ✅ Verification Checklist

- [ ] Laravel Scheduler is installed in Forge (Processes → Scheduler)
- [ ] Scheduler runs every minute (`* * * * *`)
- [ ] Commands are defined in `routes/console.php`
- [ ] Commands can be run manually without errors
- [ ] Logs show command execution
- [ ] Emails are being sent (check logs for "email sent")
- [ ] In-app notifications are being created

---

## 🎯 Quick Test Script

Create a test script to verify everything:

```bash
#!/bin/bash
# test-scheduled-commands.sh

echo "=== Testing Scheduled Commands ==="
echo ""

echo "1. Testing medication window notifications..."
php artisan medications:notify-window-opening
echo ""

echo "2. Testing notification generation..."
php artisan notifications:generate
echo ""

echo "3. Testing reminder dispatch..."
php artisan reminders:dispatch
echo ""

echo "4. Checking scheduler list..."
php artisan schedule:list
echo ""

echo "=== Test Complete ==="
```

Run it:
```bash
chmod +x test-scheduled-commands.sh
./test-scheduled-commands.sh
```

---

## 📝 Summary

**All three commands are already configured and should be working** because:

1. ✅ Laravel Scheduler is installed (runs every minute)
2. ✅ Commands are scheduled in `routes/console.php`
3. ✅ Commands exist and are functional

**To verify they're working**:
1. Test each command manually
2. Check logs for execution
3. Monitor email sends
4. Check in-app notifications

**If they're not working**:
1. Check scheduler is installed
2. Verify commands can run manually
3. Check logs for errors
4. Verify mail configuration

The scheduler automatically runs these commands at their scheduled times - no additional setup needed!
