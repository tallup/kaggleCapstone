# Quick Start: Pusher Setup on Laravel Forge

## 5-Minute Setup Guide

### Step 1: Get Pusher Credentials (2 minutes)

1. Go to [pusher.com](https://pusher.com) and sign up
2. Create a new app:
   - Name: `HomeLogic360`
   - Cluster: Choose closest to your server
3. Copy your credentials:
   - App ID
   - Key
   - Secret
   - Cluster

### Step 2: Add to Forge Environment (1 minute)

1. In Laravel Forge, go to your site
2. Click **"Environment"** → Edit `.env`
3. Add these lines:

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=paste_your_app_id
PUSHER_APP_KEY=paste_your_key
PUSHER_APP_SECRET=paste_your_secret
PUSHER_APP_CLUSTER=paste_your_cluster

VITE_PUSHER_APP_KEY=paste_your_key_again
VITE_PUSHER_APP_CLUSTER=paste_your_cluster_again
```

4. Click **"Save"**

### Step 3: Set Up Queue Worker (1 minute)

1. In Forge, go to your site
2. Click **"Daemons"** → **"Create Daemon"**
3. Enter:
   - **Command**: `php artisan queue:work --tries=3 --timeout=90`
   - **Directory**: `/home/forge/your-site-domain.com/current`
   - ✅ **Auto-restart**: Enabled
4. Click **"Create Daemon"**

### Step 4: Deploy (1 minute)

1. In Forge, click **"Deploy Now"**
   - This rebuilds assets with new env vars
   - Restarts services

### Step 5: Verify (30 seconds)

1. Open your production site
2. Check browser console (F12)
3. Look for: `[Echo] Connected to Pusher`
4. See "Live" indicator in top-right corner

## ✅ Done!

Your real-time features are now active.

## Troubleshooting

**Not connecting?**
- Verify all env vars are saved in Forge
- Check Pusher dashboard for app status
- Ensure queue worker is running

**Events not working?**
- Check queue worker logs in Forge
- Verify `BROADCAST_CONNECTION=pusher` is set
- Test with: `php artisan tinker` → `config('broadcasting.default')`

**Need more help?**
See [FORGE_PUSHER_SETUP.md](./FORGE_PUSHER_SETUP.md) for detailed guide.
