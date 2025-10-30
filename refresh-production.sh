#!/usr/bin/env bash

set -euo pipefail

# Refresh production deployment, clear caches, run migrations, and restart PHP-FPM.
# Edit these variables to match your server.

APP_DIR="/home/forge/evergreen-gpga9dpd.on-forge.com/current"   # Path to your release/current dir
PHP_FPM_SERVICE="php8.3-fpm"                                      # e.g., php8.2-fpm, php8.1-fpm

log() { echo -e "\033[1;32m==> $*\033[0m"; }

cd "$APP_DIR"

log "Pulling latest code"
git fetch --all --prune
git reset --hard origin/master

log "Installing composer dependencies"
composer install --no-dev --prefer-dist -o

log "Running database migrations"
php artisan migrate --force

log "Clearing and rebuilding caches"
php artisan optimize:clear
php artisan config:cache
php artisan route:clear
php artisan view:clear

log "Restarting PHP-FPM (clears OPCache)"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$PHP_FPM_SERVICE" || true
else
  sudo service "$PHP_FPM_SERVICE" restart || true
fi

log "Done. Test: /admin/caregiver-dashboard"


