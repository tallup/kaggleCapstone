#!/bin/bash

echo "🚀 Fixing production 500 error..."

# 1. Pull latest changes
echo "🔄 Pulling latest code from GitHub..."
git pull origin master

# 2. Clear all caches
echo "🧹 Clearing all caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear

# 3. Run migrations (if any)
echo "🗄️ Running migrations..."
php artisan migrate --force

# 4. Re-cache for production
echo "⚡ Re-caching for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Production 500 error fix completed!"
echo "The /admin/assessments page should now work properly."
