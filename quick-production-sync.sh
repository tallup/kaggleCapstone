#!/bin/bash

# Quick Production Sync Script
# Run this on your production server to sync with latest changes

echo "🚀 Quick Production Sync Starting..."

# 1. Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin master

# 2. Run migrations
echo "🗄️ Running migrations..."
php artisan migrate --force

# 3. Run unified seeder
echo "🌱 Running unified production seeder..."
php artisan db:seed --class=UnifiedProductionSeeder --force

# 4. Clear caches
echo "🧹 Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 5. Optimize for production
echo "⚡ Optimizing..."
php artisan config:cache
php artisan route:cache

echo "✅ Production sync completed!"
echo "🎉 Your production environment should now match your local environment!"
