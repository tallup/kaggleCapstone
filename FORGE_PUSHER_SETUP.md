# Setting Up Pusher on Laravel Forge (Production)

This guide walks you through configuring Pusher for real-time features on your Laravel Forge production server.

## Step 1: Create Pusher Account

1. Go to [pusher.com](https://pusher.com)
2. Sign up for a free account (or paid plan for production)
3. Verify your email address

## Step 2: Create a Pusher App

1. Log in to your Pusher dashboard
2. Click **"Create app"** or **"Channels apps"** → **"Create"**
3. Fill in the details:
   - **App name**: `HomeLogic360` (or your app name)
   - **Cluster**: Choose closest to your server (e.g., `us2`, `eu`, `ap-southeast-1`)
   - **Front-end tech**: React
   - **Back-end tech**: Laravel
4. Click **"Create app"**

## Step 3: Get Your Pusher Credentials

After creating the app, you'll see your credentials:

1. **App ID**: `1234567`
2. **Key**: `abc123def456`
3. **Secret**: `xyz789secret123`
4. **Cluster**: `us2` (or your chosen cluster)

**Important**: Keep these credentials secure. Never commit them to version control.

## Step 4: Configure Environment Variables in Laravel Forge

### Option A: Using Forge Web Interface (Recommended)

1. Log in to [Laravel Forge](https://forge.laravel.com)
2. Select your server
3. Select your site
4. Click on **"Environment"** in the left sidebar
5. Scroll down to find the `.env` file editor
6. Add or update the following variables:

```env
# Broadcasting Configuration
BROADCAST_CONNECTION=pusher

# Pusher Credentials
PUSHER_APP_ID=your_app_id_here
PUSHER_APP_KEY=your_app_key_here
PUSHER_APP_SECRET=your_app_secret_here
PUSHER_APP_CLUSTER=your_cluster_here

# Pusher Connection Settings (optional, defaults shown)
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
```

7. Click **"Save"** to save the environment file

### Option B: Using SSH

If you prefer using SSH:

```bash
# SSH into your Forge server
ssh forge@your-server-ip

# Navigate to your site directory
cd /home/forge/your-site-domain.com

# Edit the .env file
nano .env

# Add the Pusher variables (same as above)
# Save and exit (Ctrl+X, then Y, then Enter)
```

## Step 5: Configure Frontend Environment Variables

The frontend also needs Pusher credentials. In Laravel Forge:

1. Go to your site's **"Environment"** page
2. Add these variables (they'll be available to Vite during build):

```env
# Frontend Pusher Configuration
VITE_PUSHER_APP_KEY=your_app_key_here
VITE_PUSHER_APP_CLUSTER=your_cluster_here
VITE_PUSHER_HOST=
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
```

**Note**: `VITE_` prefix is required for Vite to expose these variables to the frontend.

## Step 6: Rebuild Frontend Assets

After adding environment variables, rebuild your frontend:

### Option A: Using Forge Web Interface

1. Go to your site in Forge
2. Click **"Deploy Now"** (this will rebuild assets with new env vars)

### Option B: Using SSH

```bash
# SSH into your server
ssh forge@your-server-ip

# Navigate to your site
cd /home/forge/your-site-domain.com

# Rebuild assets
npm run build

# Or if using the deployment script
./deploy-simple.sh
```

## Step 7: Configure Queue Worker

Real-time events are queued for performance. Ensure your queue worker is running:

### Option A: Using Forge Daemon (Recommended)

1. In Forge, go to your site
2. Click **"Daemons"** in the left sidebar
3. Click **"Create Daemon"**
4. Configure:
   - **Command**: `php artisan queue:work --tries=3 --timeout=90`
   - **User**: `forge`
   - **Directory**: `/home/forge/your-site-domain.com/current` (or your site path)
   - **Auto-restart**: ✅ Enabled
5. Click **"Create Daemon"**

### Option B: Using Supervisor (Manual)

If you prefer Supervisor, add this to `/etc/supervisor/conf.d/your-site-queue.conf`:

```ini
[program:your-site-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /home/forge/your-site-domain.com/artisan queue:work --tries=3 --timeout=90
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=forge
numprocs=1
redirect_stderr=true
stdout_logfile=/home/forge/your-site-domain.com/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start your-site-queue:*
```

## Step 8: Clear and Cache Configuration

After setting environment variables, clear and rebuild caches:

```bash
# SSH into your server
ssh forge@your-server-ip
cd /home/forge/your-site-domain.com

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Step 9: Verify Configuration

### Test Backend Configuration

```bash
# SSH into your server
ssh forge@your-server-ip
cd /home/forge/your-site-domain.com

# Test Pusher connection
php artisan tinker
```

Then in Tinker:
```php
use Illuminate\Support\Facades\Broadcast;

// Check if broadcasting is configured
config('broadcasting.default'); // Should return 'pusher'

// Check Pusher config
config('broadcasting.connections.pusher.app_id'); // Should return your app ID
config('broadcasting.connections.pusher.key'); // Should return your key
config('broadcasting.connections.pusher.secret'); // Should return your secret
config('broadcasting.connections.pusher.options.cluster'); // Should return your cluster

// Exit tinker
exit
```

### Test Frontend Configuration

1. Open your production site in a browser
2. Open browser console (F12)
3. Check for Echo initialization:
   - Should see: `[Echo] Initialized successfully`
   - Should see: `[Echo] Connected to Pusher`
4. Check for connection indicator in top-right corner (should show "Live")

### Test Real-time Events

1. Open your site in two browser windows/tabs
2. In one window, create a medication administration or record vitals
3. Watch the other window update automatically
4. Check browser console for real-time event logs

## Step 10: Monitor Queue Workers

Monitor your queue workers to ensure they're processing events:

### Check Queue Status

```bash
# SSH into server
ssh forge@your-server-ip
cd /home/forge/your-site-domain.com

# Check queue status
php artisan queue:monitor

# Or check failed jobs
php artisan queue:failed
```

### View Queue Logs

In Forge:
1. Go to your site
2. Click **"Logs"** in the left sidebar
3. Select **"Queue Worker"** log

Or via SSH:
```bash
tail -f storage/logs/queue-worker.log
```

## Troubleshooting

### Issue: "Echo not connecting"

**Solutions:**
1. Check browser console for errors
2. Verify `VITE_PUSHER_APP_KEY` is set correctly
3. Verify `VITE_PUSHER_APP_CLUSTER` matches your Pusher cluster
4. Check browser network tab for WebSocket connection
5. Verify Pusher credentials in Pusher dashboard

### Issue: "Events not broadcasting"

**Solutions:**
1. Verify queue worker is running: `php artisan queue:work`
2. Check queue logs for errors
3. Verify `BROADCAST_CONNECTION=pusher` in `.env`
4. Check Laravel logs: `tail -f storage/logs/laravel.log`
5. Test event manually in Tinker:
   ```php
   event(new \App\Events\MedicationAdministrationCreated($administration));
   ```

### Issue: "Authentication failed"

**Solutions:**
1. Verify `/api/v1/broadcasting/auth` route exists
2. Check that user is authenticated
3. Verify Sanctum token is valid
4. Check CORS settings if using different domain

### Issue: "Queue worker not processing"

**Solutions:**
1. Check if daemon is running in Forge
2. Restart queue worker:
   ```bash
   php artisan queue:restart
   ```
3. Check supervisor/daemon logs
4. Verify queue connection in `.env`:
   ```env
   QUEUE_CONNECTION=database
   # or
   QUEUE_CONNECTION=redis
   ```

## Security Best Practices

1. **Never commit credentials**: Pusher credentials should only be in `.env`
2. **Use environment-specific keys**: Different keys for staging/production
3. **Enable Pusher app authentication**: In Pusher dashboard, enable "Client Events" only if needed
4. **Monitor usage**: Check Pusher dashboard for unusual activity
5. **Set up alerts**: Configure Pusher alerts for high message rates

## Pusher Limits (Free Tier)

- **200,000 messages/day**
- **100 concurrent connections**
- **Unlimited channels**

For production, consider upgrading if you exceed these limits.

## Cost Optimization

1. **Use private channels only when needed**: Public channels don't count toward connection limits
2. **Batch events when possible**: Reduce message count
3. **Monitor usage**: Check Pusher dashboard regularly
4. **Consider Laravel Reverb**: Self-hosted alternative (Laravel 11+)

## Additional Resources

- [Pusher Documentation](https://pusher.com/docs)
- [Laravel Broadcasting Docs](https://laravel.com/docs/broadcasting)
- [Laravel Forge Docs](https://forge.laravel.com/docs)

## Quick Checklist

- [ ] Pusher account created
- [ ] Pusher app created
- [ ] Backend env variables set in Forge
- [ ] Frontend env variables set in Forge
- [ ] Assets rebuilt
- [ ] Queue worker configured and running
- [ ] Configuration cached
- [ ] Tested connection
- [ ] Tested real-time events
- [ ] Monitored queue logs

---

**Need Help?** Check the main [REALTIME_FEATURES_SETUP.md](./REALTIME_FEATURES_SETUP.md) for more details.
