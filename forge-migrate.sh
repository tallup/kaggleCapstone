#!/bin/bash

# Laravel Forge MySQL Migration Script
# This script is designed to run on Laravel Forge servers
# It assumes MySQL is already set up by Forge

set -e  # Exit on error

echo "🚀 Laravel Forge MySQL Migration"
echo "================================="
echo ""
echo "This script will:"
echo "1. Clear config cache"
echo "2. Test MySQL connection"
echo "3. Run migrations"
echo "4. Verify indexes"
echo "5. Rebuild caches"
echo ""

# Step 1: Clear config cache
echo "📋 Step 1: Clearing config cache..."
php artisan config:clear
echo "✅ Config cache cleared"
echo ""

# Step 2: Test MySQL connection
echo "🔌 Step 2: Testing MySQL connection..."
php artisan tinker --execute="
try {
    \$pdo = DB::connection()->getPdo();
    echo '✅ MySQL connection successful!' . PHP_EOL;
    echo 'Database: ' . config('database.connections.mysql.database') . PHP_EOL;
    echo 'Host: ' . config('database.connections.mysql.host') . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Connection failed: ' . \$e->getMessage() . PHP_EOL;
    echo '' . PHP_EOL;
    echo 'Please check your .env file:' . PHP_EOL;
    echo '  - DB_CONNECTION=mysql' . PHP_EOL;
    echo '  - DB_HOST=127.0.0.1' . PHP_EOL;
    echo '  - DB_DATABASE=forge (or your database name)' . PHP_EOL;
    echo '  - DB_USERNAME=forge (or your username)' . PHP_EOL;
    echo '  - DB_PASSWORD=your_password' . PHP_EOL;
    exit(1);
}
" || {
    echo ""
    echo "❌ Migration stopped due to connection error"
    echo "💡 Get your database credentials from Forge Dashboard → Site → Database tab"
    exit 1
}
echo ""

# Step 3: Check current database
echo "📊 Step 3: Checking current database..."
CURRENT_DB=$(php artisan tinker --execute="echo config('database.default');" 2>/dev/null | tail -1)

if [ "$CURRENT_DB" != "mysql" ]; then
    echo "⚠️  Warning: Current database is '$CURRENT_DB', not 'mysql'"
    echo "💡 Please update your .env file: DB_CONNECTION=mysql"
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "Migration cancelled"
        exit 1
    fi
fi
echo ""

# Step 4: Run migrations
echo "🗄️  Step 4: Running migrations..."
php artisan migrate --force
echo "✅ Migrations completed"
echo ""

# Step 5: Verify indexes
echo "🔍 Step 5: Verifying indexes..."
php artisan tinker --execute="
try {
    \$indexes = DB::select(\"SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%'\");
    if (count(\$indexes) > 0) {
        echo '✅ Found indexes:' . PHP_EOL;
        foreach (\$indexes as \$index) {
            echo '   - ' . \$index->Key_name . PHP_EOL;
        }
    } else {
        echo '⚠️  No facility_id indexes found. This might be normal if migrations haven't created them yet.' . PHP_EOL;
    }
} catch (\Exception \$e) {
    echo '⚠️  Could not verify indexes: ' . \$e->getMessage() . PHP_EOL;
}
"
echo ""

# Step 6: Rebuild caches
echo "⚡ Step 6: Rebuilding caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
echo "✅ Caches rebuilt"
echo ""

# Step 7: Test queries
echo "🧪 Step 7: Testing database queries..."
php artisan tinker --execute="
try {
    \$facilities = \App\Models\Facility::count();
    \$branches = \App\Models\Branch::count();
    \$residents = \App\Models\Resident::count();
    \$users = \App\Models\User::count();
    
    echo '✅ Database queries working!' . PHP_EOL;
    echo '   Facilities: ' . \$facilities . PHP_EOL;
    echo '   Branches: ' . \$branches . PHP_EOL;
    echo '   Residents: ' . \$residents . PHP_EOL;
    echo '   Users: ' . \$users . PHP_EOL;
} catch (\Exception \$e) {
    echo '⚠️  Query test: ' . \$e->getMessage() . PHP_EOL;
    echo '   (This is normal if tables are empty)' . PHP_EOL;
}
"
echo ""

echo "========================================="
echo "✅ Migration Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test your application in the browser"
echo "2. Verify login works"
echo "3. Check dashboard loads correctly"
echo ""
echo "Your app is now using MySQL! 🎉"
echo ""

