#!/bin/bash

# Laravel Forge Deployment Script for Edmond Serenity AFH
echo "🚀 Starting deployment for Edmond Serenity AFH..."

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

# Seed production data (only on first deployment)
if [ ! -f .deployed ]; then
    echo "🌱 Seeding production database..."
    php artisan db:seed --class=ProductionSeeder --force
    touch .deployed
fi

# Clear and cache configuration
echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Clear application cache
php artisan cache:clear

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

echo "✅ Deployment completed successfully!"
echo "🌐 Application is now live at: https://evergreen-v5ywe0w6.on-forge.com"