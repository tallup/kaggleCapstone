#!/bin/bash

# Drop All Tables Script for Production
echo "⚠️  WARNING: This will DROP ALL TABLES from the database!"
echo "🔄 Starting drop all tables..."

# Drop all tables and run fresh migrations
echo "🗑️ Dropping all tables..."
php artisan migrate:fresh --force --drop-views

echo "✅ All tables have been dropped!"
echo "💡 Run 'php artisan migrate' to recreate the tables."
