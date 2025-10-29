#!/bin/bash

# Quick Fix Script for Production 500 Error
# This script creates missing system tables without dropping existing data

echo "🔧 Fixing production 500 error..."

# Navigate to project directory
cd /home/forge/evergreen-gpga9dpd.on-forge.com/current || cd /home/forge/*/current || exit 1

# Run the migration to create missing tables
echo "📦 Creating missing system tables..."
php artisan migrate --force

# Clear all caches
echo "🧹 Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild caches
echo "⚡ Rebuilding caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart PHP-FPM
echo "🔄 Restarting PHP-FPM..."
sudo service php8.3-fpm restart || sudo service php8.2-fpm restart || sudo service php8.1-fpm restart

echo "✅ Fix completed! Try accessing your site now."