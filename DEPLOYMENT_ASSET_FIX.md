# Fix for JavaScript Module Loading Errors (MIME Type Issues)

## Problem
JavaScript modules are being served with MIME type "text/html" instead of "application/javascript", causing module loading failures.

## Root Cause
Laravel Forge uses **Nginx**, not Apache, so `.htaccess` files don't work. The Nginx configuration needs to be updated to properly serve static assets from the `build` directory.

## Solution

### Step 1: Update Nginx Configuration in Laravel Forge

1. Log into your Laravel Forge dashboard
2. Navigate to your site (`homelogic360.net`)
3. Go to **Site Settings** → **Nginx Configuration**
4. Find the `location /` block and add this configuration **BEFORE** the main `location /` block:

```nginx
# Serve JavaScript modules with correct MIME type
location ~ ^/build/assets/.*\.(js|mjs)$ {
    try_files $uri =404;
    add_header Content-Type "application/javascript; charset=utf-8" always;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Content-Type-Options "nosniff" always;
    expires 1y;
}

# Serve CSS files with correct MIME type
location ~ ^/build/assets/.*\.css$ {
    try_files $uri =404;
    add_header Content-Type "text/css; charset=utf-8" always;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    expires 1y;
}

# Serve pre-compressed files (brotli)
location ~ ^/build/assets/.*\.br$ {
    try_files $uri =404;
    add_header Content-Encoding br always;
    add_header Vary "Accept-Encoding" always;
    expires 1y;
}

# Serve pre-compressed files (gzip)
location ~ ^/build/assets/.*\.gz$ {
    try_files $uri =404;
    add_header Content-Encoding gzip always;
    add_header Vary "Accept-Encoding" always;
    expires 1y;
}

# Serve other static assets (images, fonts, etc.)
location ~ ^/build/assets/.*\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

5. Click **Save** and then **Restart Nginx**

### Step 2: Rebuild Assets on Production

SSH into your production server and run:

```bash
cd /home/forge/homelogic360.net  # or your actual site path
npm ci
npm run build
php artisan view:clear
php artisan config:clear
```

### Step 3: Verify the Fix

1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check the browser console - you should no longer see MIME type errors
3. Verify that JavaScript files are being served with `Content-Type: application/javascript`

## Alternative: Quick Fix Script

If you have SSH access, you can run this script:

```bash
#!/bin/bash
cd /home/forge/homelogic360.net  # Update with your actual path
npm ci
npm run build
php artisan view:clear
php artisan config:clear
php artisan cache:clear
```

## Verification

After applying the fix, check the Network tab in browser DevTools:
- JavaScript files should have `Content-Type: application/javascript`
- Files should load successfully (status 200)
- No more "disallowed MIME type" errors

## Notes

- The Nginx configuration must be added **before** the main `location /` block
- After updating Nginx config, always restart Nginx
- If you're using a CDN or proxy (like Cloudflare), ensure it's not interfering with MIME types
- The build hash mismatch (`FacilityEdit-DXt47LHu.js` vs `FacilityEdit-DSxisi4W.js`) indicates the production build is outdated - rebuild to fix

