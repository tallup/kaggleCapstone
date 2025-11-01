# Laravel Forge Deployment Guide for Edmond Serenity AFH

This guide will help you deploy the Edmond Serenity AFH application to production using Laravel Forge.

## Prerequisites

- Laravel Forge account
- Domain name configured
- GitHub repository access
- SSL certificate (Forge can provide Let's Encrypt)

## Step 1: Create a New Site in Forge

1. Log into your Laravel Forge dashboard
2. Click "Create Site"
3. Choose "Git Repository"
4. Enter your repository URL: `https://github.com/tallup/Evergreen.git`
5. Select the branch: `master`
6. Choose your server
7. Enter your domain name
8. Set the web directory to: `/public`

## Step 2: Configure Environment Variables

In your Forge site settings, add these environment variables:

```bash
# Copy from forge.env.example and update with your values
APP_NAME="Edmond Serenity AFH"
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_TIMEZONE=America/Los_Angeles
APP_URL=https://your-domain.com

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=edmond_serenity_afh
DB_USERNAME=forge
DB_PASSWORD=YOUR_DB_PASSWORD_HERE

# Session Configuration
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false

# Cache Configuration
CACHE_STORE=database
CACHE_PREFIX=

# Queue Configuration
QUEUE_CONNECTION=database

# Mail Configuration
MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@your-domain.com"
MAIL_FROM_NAME="${APP_NAME}"

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

# Security
BCRYPT_ROUNDS=12
```

## Step 3: Configure Deployment Script

In your Forge site settings, set the deployment script to:

```bash
#!/bin/bash

# Laravel Forge Deployment Script for Edmond Serenity AFH
echo "🚀 Starting deployment for Edmond Serenity AFH..."

# Exit on any error
set -e

# Navigate to the application directory
cd /home/forge/your-domain.com

# Pull the latest code from the repository
echo "📥 Pulling latest code from repository..."
git pull origin master

# Install/update Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Install/update NPM dependencies and build assets
echo "🎨 Building frontend assets..."
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
```

## Step 4: Database Setup

1. In Forge, go to your site's "Database" tab
2. Create a new MySQL database named `edmond_serenity_afh`
3. Note the database credentials for your `.env` file

## Step 5: SSL Certificate

1. In your Forge site settings, go to "SSL"
2. Click "Let's Encrypt" to get a free SSL certificate
3. Enable "Force HTTPS" for security

## Step 6: Queue Workers (Optional)

If you plan to use background jobs:

1. Go to "Daemons" in your Forge site
2. Add a new daemon:
   - Command: `php artisan queue:work --sleep=3 --tries=3 --max-time=3600`
   - User: `forge`
   - Directory: `/home/forge/your-domain.com`

## Step 7: Configure Cron Job for Scheduled Tasks

**IMPORTANT**: You must add a cron job for the Laravel scheduler to run scheduled tasks like notifications.

1. Go to "Cron Jobs" in your Forge site
2. Add a new cron job:
   - Command: `php artisan schedule:run`
   - User: `forge`
   - Directory: `/home/forge/your-domain.com`
   - Frequency: `* * * * *` (runs every minute)

This will ensure your notification generation command runs every hour as scheduled.

## Step 8: Backup Configuration

1. Go to "Backups" in your Forge site
2. Enable database backups
3. Set backup frequency (daily recommended)
4. Configure backup retention (30 days recommended)

## Step 9: Monitoring

1. Enable "Monitoring" in your Forge site
2. Set up uptime monitoring
3. Configure email notifications for downtime

## Step 10: First Deployment

1. Click "Deploy Now" in your Forge site
2. Monitor the deployment logs
3. Check for any errors in the deployment process

## Step 11: Post-Deployment Verification

After successful deployment:

1. Visit your domain to ensure the application loads
2. Test the admin login:
   - URL: `https://your-domain.com/admin/login`
   - Email: `admin@edmondserenity.com`
   - Password: `admin123!`
3. Verify the notification system:
   - Check that notifications are displayed in the UI
   - Manually run: `php artisan notifications:generate` to test
   - Verify the cron job is running correctly
4. Test key features:
   - Create a resident
   - Add an appointment
   - Record vital signs
   - Add a medication

## Maintenance

### Regular Tasks:
- Check application logs weekly
- Review and monitor scheduled tasks
- Check database backups
- Update dependencies monthly
- Review security logs

### Updates:
- Forge will automatically update PHP and system packages
- Update Laravel and packages via Composer
- Test updates in staging environment first

## Troubleshooting

### Common Issues:

1. **Deployment fails**: Check deployment logs in Forge
2. **Database connection errors**: Verify database credentials in `.env`
3. **Permission errors**: Ensure proper file permissions
4. **Asset loading issues**: Run `npm run build` manually
5. **Notifications not generating**: Verify the cron job is configured correctly

### Log Locations:
- Application logs: `/home/forge/your-domain.com/storage/logs/`
- Nginx logs: Available in Forge dashboard
- PHP-FPM logs: Available in Forge dashboard
- Schedule logs: Check Laravel logs for `schedule:run` output

## Support

For issues specific to this application:
1. Check the application logs
2. Review the deployment logs in Forge
3. Verify environment variables
4. Test database connectivity
5. Verify scheduled tasks are running

For Forge-specific issues:
1. Check Forge documentation
2. Contact Forge support
3. Review Forge community forums

---

**Important Notes:**
- Always test deployments in a staging environment first
- Keep backups of your database before major updates
- Monitor your application's performance and uptime
- Keep your dependencies updated for security
- **CRITICAL**: Ensure the cron job `php artisan schedule:run` is configured to run every minute for scheduled tasks to work
