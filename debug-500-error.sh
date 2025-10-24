#!/bin/bash

# Debug 500 Error Script
# This script helps diagnose the root cause of the 500 error

echo "🔍 Debugging 500 Error..."
echo "========================="

# Navigate to the current release directory
cd /home/forge/evergreen-izgwu9lk.on-forge.com/current

echo "📁 Working in directory: $(pwd)"
echo ""

# 1. Check if we're in the right directory
echo "🔍 Step 1: Checking directory structure..."
if [ -f "artisan" ]; then
    echo "✅ Found artisan file"
else
    echo "❌ No artisan file found"
    exit 1
fi

# 2. Check Laravel application status
echo ""
echo "🔍 Step 2: Checking Laravel application status..."
php artisan --version

# 3. Check database connection
echo ""
echo "🔍 Step 3: Testing database connection..."
php artisan tinker --execute="
try {
    DB::connection()->getPdo();
    echo '✅ Database connection successful';
} catch (Exception \$e) {
    echo '❌ Database connection failed: ' . \$e->getMessage();
}
"

# 4. Check if all required tables exist
echo ""
echo "🔍 Step 4: Checking required tables..."
php artisan tinker --execute="
use Illuminate\Support\Facades\Schema;

\$tables = ['users', 'branches', 'residents', 'medications', 'appointments', 'cache'];
foreach (\$tables as \$table) {
    if (Schema::hasTable(\$table)) {
        echo '✅ Table ' . \$table . ' exists';
    } else {
        echo '❌ Table ' . \$table . ' missing';
    }
}
"

# 5. Check application logs
echo ""
echo "🔍 Step 5: Checking recent application logs..."
if [ -f "storage/logs/laravel.log" ]; then
    echo "Last 20 lines of Laravel log:"
    tail -20 storage/logs/laravel.log
else
    echo "No Laravel log file found"
fi

# 6. Check web server error logs
echo ""
echo "🔍 Step 6: Checking web server error logs..."
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Recent Nginx errors:"
    tail -10 /var/log/nginx/error.log
else
    echo "Nginx error log not found"
fi

# 7. Check if .env file exists and has required values
echo ""
echo "🔍 Step 7: Checking .env configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Checking key configuration values:"
    grep -E "^(APP_KEY|DB_CONNECTION|DB_HOST|DB_DATABASE)" .env || echo "Some required values missing"
else
    echo "❌ .env file missing"
fi

# 8. Test a simple route
echo ""
echo "🔍 Step 8: Testing application routes..."
php artisan route:list | head -5

# 9. Check file permissions
echo ""
echo "🔍 Step 9: Checking file permissions..."
ls -la storage/
ls -la bootstrap/cache/

# 10. Try to access the application programmatically
echo ""
echo "🔍 Step 10: Testing application access..."
php -r "
try {
    \$app = require_once 'bootstrap/app.php';
    \$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    echo '✅ Application bootstrap successful';
} catch (Exception \$e) {
    echo '❌ Application bootstrap failed: ' . \$e->getMessage();
}
"

echo ""
echo "🎉 Debug completed!"
echo "==================="
echo "Please share the output above to help identify the root cause."
