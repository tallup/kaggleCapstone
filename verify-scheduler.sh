#!/bin/bash

# Verify Laravel Scheduler Setup
# This script checks if the Laravel scheduler cron job is properly configured

echo "🔍 Verifying Laravel Scheduler Setup..."
echo ""

# Check if we're in the right directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: artisan file not found. Please run this script from your Laravel project root."
    exit 1
fi

# Check if cron job exists
echo "1. Checking for schedule:run cron job..."
if crontab -l 2>/dev/null | grep -q "schedule:run"; then
    echo "   ✅ Cron job found:"
    crontab -l | grep "schedule:run" | sed 's/^/      /'
else
    echo "   ❌ No cron job found for schedule:run"
    echo ""
    echo "   To fix this, add the following cron job in Laravel Forge:"
    echo "   - Command: php artisan schedule:run"
    echo "   - User: forge"
    echo "   - Directory: $(pwd)"
    echo "   - Frequency: * * * * * (every minute)"
    echo ""
fi

# Check Laravel scheduler list
echo ""
echo "2. Checking scheduled tasks..."
php artisan schedule:list 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Scheduler is accessible"
else
    echo "   ⚠️  Could not list scheduled tasks (this is okay if running from wrong directory)"
fi

# Test missed medications command
echo ""
echo "3. Testing missed medications command..."
php artisan medications:mark-missed --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Command exists and is accessible"
    echo "   💡 Run 'php artisan medications:mark-missed' to manually mark missed medications"
else
    echo "   ❌ Command not found or not accessible"
fi

# Check timezone
echo ""
echo "4. Checking application timezone..."
TIMEZONE=$(php artisan tinker --execute="echo config('app.timezone');" 2>/dev/null)
if [ ! -z "$TIMEZONE" ]; then
    echo "   ✅ Timezone: $TIMEZONE"
else
    echo "   ⚠️  Could not determine timezone"
fi

# Check if schedule:run works
echo ""
echo "5. Testing schedule:run command..."
php artisan schedule:run > /tmp/schedule-test.log 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ schedule:run executed successfully"
    if [ -s /tmp/schedule-test.log ]; then
        echo "   📋 Output:"
        cat /tmp/schedule-test.log | sed 's/^/      /'
    else
        echo "   ℹ️  No tasks were due to run at this time (this is normal)"
    fi
else
    echo "   ❌ schedule:run failed - check the error above"
fi

# Cleanup
rm -f /tmp/schedule-test.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Summary:"
echo ""
echo "To ensure the scheduler runs automatically:"
echo "1. Add cron job in Laravel Forge: 'php artisan schedule:run' (every minute)"
echo "2. Verify it's running by checking 'Last Run' in Forge dashboard"
echo "3. Monitor logs: tail -f storage/logs/laravel.log"
echo ""
echo "The scheduler will automatically:"
echo "  • Mark missed medications every 30 minutes"
echo "  • Generate notifications every hour"
echo "  • Generate reminders every 30 minutes"
echo "  • Dispatch reminders every 5 minutes"
echo ""

