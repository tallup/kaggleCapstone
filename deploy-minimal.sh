#!/bin/bash

# Simple Laravel Forge Deployment Script
echo "🚀 Starting deployment..."

# Install Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Build assets
echo "🎨 Building frontend assets..."
npm ci
npm run build

if [ ! -f public/build/manifest.json ] && [ ! -d public/build ]; then
    echo "❌ Frontend build artifacts missing (expected public/build/manifest.json or public/build/)"
    exit 1
fi

# Run migrations
echo "🗄️ Running database migrations..."
php artisan migrate --force

# Seed data (first time only)
if [ ! -f .deployed ]; then
    echo "🌱 Seeding production database..."
    php artisan db:seed --class=ProductionSeeder --force
    touch .deployed
fi

# Cache configuration
echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Clear cache
php artisan cache:clear

# Restart services
echo "🔄 Restarting services..."
sudo service php8.3-fpm restart
php artisan queue:restart

echo "✅ Deployment completed!"



