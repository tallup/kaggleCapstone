#!/bin/bash

# Multi-Tenant Deployment Script for Evergreen
# Branch: multi-tenant
echo "🚀 Starting Multi-Tenant Deployment for Evergreen..."

# Exit on any error
set -e

# Install/update Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Install/update NPM dependencies and build assets
echo "🎨 Building frontend assets..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm ci
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
php artisan migrate --force

# Ensure required roles exist (administrator, admin, caregiver)
echo "👥 Ensuring required roles exist..."
php artisan roles:ensure-exist

# Create super admin (first time only or if needed)
if [ ! -f .super-admin-created ]; then
    echo "👤 Creating super admin account..."
    php artisan db:seed --class=SuperAdminSeeder --force || echo "Super admin may already exist"
    touch .super-admin-created
fi

# Create storage symlink (for facility logo uploads)
echo "🔗 Creating storage symlink..."
php artisan storage:link || echo "Storage link may already exist"

# Clear and cache configuration
echo "⚡ Optimizing application..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Set permissions
echo "🔐 Setting file permissions..."
chmod -R 775 storage bootstrap/cache 2>/dev/null || echo "Permissions may need manual adjustment"

# Restart PHP-FPM (try different versions)
echo "🔄 Restarting PHP-FPM..."
if command -v php8.3-fpm &> /dev/null; then
    sudo service php8.3-fpm restart
elif command -v php8.4-fpm &> /dev/null; then
    sudo service php8.4-fpm restart
else
    sudo service php-fpm restart
fi

# Restart queue workers (if using queues)
echo "🔄 Restarting queue workers..."
php artisan queue:restart

echo "✅ Multi-Tenant Deployment completed successfully!"
echo ""
echo "📋 Post-Deployment Checklist:"
echo "  1. Verify super admin account: php artisan tinker → User::where('role', 'super_admin')->first()"
echo "  2. Test facility registration: https://your-domain.com/facility-registration"
echo "  3. Test facility customization (upload logo, change colors)"
echo "  4. Verify theme system works correctly"
echo ""
echo "⚠️  IMPORTANT: Change default super admin password after first login!"