#!/bin/bash

# MySQL Migration Helper Script
# This script helps migrate from SQLite to MySQL

set -e  # Exit on error

echo "🚀 Starting SQLite to MySQL Migration"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Backup
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
if [ -f "database/database.sqlite" ]; then
    BACKUP_FILE="database/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)"
    cp database/database.sqlite "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  SQLite database not found, skipping backup${NC}"
fi
echo ""

# Step 2: Check MySQL connection
echo -e "${YELLOW}Step 2: Checking MySQL connection...${NC}"
read -p "Enter MySQL root password (or press Enter if no password): " MYSQL_ROOT_PASSWORD

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    MYSQL_CMD="mysql -u root"
else
    MYSQL_CMD="mysql -u root -p$MYSQL_ROOT_PASSWORD"
fi

# Test connection
if $MYSQL_CMD -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL connection successful${NC}"
else
    echo -e "${RED}❌ MySQL connection failed. Please check your MySQL installation and credentials.${NC}"
    exit 1
fi
echo ""

# Step 3: Get database details
echo -e "${YELLOW}Step 3: Database configuration${NC}"
read -p "Enter database name (default: evergreen_production): " DB_NAME
DB_NAME=${DB_NAME:-evergreen_production}

read -p "Enter database username (default: evergreen_user): " DB_USER
DB_USER=${DB_USER:-evergreen_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""
echo ""

# Step 4: Create database and user
echo -e "${YELLOW}Step 4: Creating database and user...${NC}"
$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created${NC}"
else
    echo -e "${RED}❌ Failed to create database/user${NC}"
    exit 1
fi
echo ""

# Step 5: Update .env file
echo -e "${YELLOW}Step 5: Updating .env file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f "forge.env.example" ]; then
        cp forge.env.example .env
    else
        echo -e "${RED}❌ No .env.example found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update database settings in .env
sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=mysql/" .env
sed -i "s/^DB_HOST=.*/DB_HOST=127.0.0.1/" .env
sed -i "s/^DB_PORT=.*/DB_PORT=3306/" .env
sed -i "s/^DB_DATABASE=.*/DB_DATABASE=${DB_NAME}/" .env
sed -i "s/^DB_USERNAME=.*/DB_USERNAME=${DB_USER}/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env

echo -e "${GREEN}✅ .env file updated${NC}"
echo ""

# Step 6: Clear config cache
echo -e "${YELLOW}Step 6: Clearing config cache...${NC}"
php artisan config:clear
echo -e "${GREEN}✅ Config cache cleared${NC}"
echo ""

# Step 7: Test connection
echo -e "${YELLOW}Step 7: Testing MySQL connection from Laravel...${NC}"
php artisan tinker --execute="
try {
    DB::connection()->getPdo();
    echo '✅ MySQL connection successful!';
} catch (\Exception \$e) {
    echo '❌ Connection failed: ' . \$e->getMessage();
    exit(1);
}
" || {
    echo -e "${RED}❌ Connection test failed. Please check your credentials.${NC}"
    echo -e "${YELLOW}💡 You can restore .env from backup if needed.${NC}"
    exit 1
}
echo ""

# Step 8: Run migrations
echo -e "${YELLOW}Step 8: Running migrations...${NC}"
read -p "Do you want to import existing data from SQLite? (y/n): " IMPORT_DATA

if [ "$IMPORT_DATA" = "y" ] || [ "$IMPORT_DATA" = "Y" ]; then
    echo -e "${YELLOW}⚠️  Running migrations (will create empty tables)...${NC}"
    php artisan migrate --force
    
    echo -e "${YELLOW}📥 To import data, you'll need to do it manually using tinker or a migration script.${NC}"
    echo -e "${YELLOW}💡 See MIGRATE_TO_MYSQL.md for data import options.${NC}"
else
    echo -e "${YELLOW}Running fresh migrations (starting with empty database)...${NC}"
    php artisan migrate --force
fi

echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

# Step 9: Verify indexes
echo -e "${YELLOW}Step 9: Verifying indexes...${NC}"
mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW INDEXES FROM branches WHERE Key_name LIKE '%facility_id%';" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not verify indexes automatically. Please check manually.${NC}"
}
echo ""

# Step 10: Rebuild caches
echo -e "${YELLOW}Step 10: Rebuilding caches...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
echo -e "${GREEN}✅ Caches rebuilt${NC}"
echo ""

# Step 11: Test queries
echo -e "${YELLOW}Step 11: Testing database queries...${NC}"
php artisan tinker --execute="
try {
    echo 'Facilities: ' . \App\Models\Facility::count() . PHP_EOL;
    echo 'Branches: ' . \App\Models\Branch::count() . PHP_EOL;
    echo 'Residents: ' . \App\Models\Resident::count() . PHP_EOL;
    echo 'Users: ' . \App\Models\User::count() . PHP_EOL;
    echo '✅ Database queries working!';
} catch (\Exception \$e) {
    echo '❌ Query test failed: ' . \$e->getMessage();
    exit(1);
}
"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test your application: php artisan serve"
echo "2. Login and verify everything works"
echo "3. Check performance improvements"
echo ""
echo "Your .env has been updated with MySQL settings."
echo "Backup of old .env saved as .env.backup.*"
echo ""

