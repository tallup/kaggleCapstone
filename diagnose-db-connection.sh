#!/bin/bash

# Database Connection Diagnostic Script
# This script helps diagnose "Connection refused" database errors on Laravel Forge

echo "🔍 Database Connection Diagnostic Tool"
echo "======================================"
echo ""

# Get the site directory from the current path or use default
SITE_DIR="${1:-/home/forge/evergreen-gpga9dpd.on-forge.com/current}"

if [ ! -d "$SITE_DIR" ]; then
    echo "⚠️  Directory not found: $SITE_DIR"
    echo "Usage: $0 [site_directory]"
    echo "Example: $0 /home/forge/evergreen-gpga9dpd.on-forge.com/current"
    exit 1
fi

cd "$SITE_DIR" || exit 1

echo "📁 Working in directory: $(pwd)"
echo ""

# 1. Check .env file exists
echo "🔍 Step 1: Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo ""
    echo "Database configuration from .env:"
    echo "--------------------------------"
    grep -E "^(DB_CONNECTION|DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD)" .env | sed 's/DB_PASSWORD=.*/DB_PASSWORD=***HIDDEN***/'
else
    echo "❌ .env file missing!"
    echo "   This is likely the problem. Create a .env file with your database credentials."
    exit 1
fi

echo ""

# 2. Check MySQL service status
echo "🔍 Step 2: Checking MySQL service status..."
if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
    echo "✅ MySQL/MariaDB service is running"
    systemctl status mysql --no-pager -l 2>/dev/null | head -3 || systemctl status mariadb --no-pager -l 2>/dev/null | head -3
else
    echo "❌ MySQL/MariaDB service is NOT running!"
    echo "   Try: sudo systemctl start mysql"
    echo "   Or: sudo systemctl start mariadb"
fi

echo ""

# 3. Test MySQL connection from command line
echo "🔍 Step 3: Testing MySQL connection from command line..."
if [ -f ".env" ]; then
    # Extract database credentials from .env
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3306")
    DB_DATABASE=$(grep "^DB_DATABASE=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_USERNAME=$(grep "^DB_USERNAME=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    echo "   Attempting to connect to: $DB_USERNAME@$DB_HOST:$DB_PORT/$DB_DATABASE"
    
    if command -v mysql &> /dev/null; then
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_DATABASE" 2>/dev/null; then
            echo "✅ MySQL command-line connection successful"
        else
            echo "❌ MySQL command-line connection failed"
            echo "   Error details:"
            mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_DATABASE" 2>&1 | head -3
        fi
    else
        echo "⚠️  mysql command not found, skipping command-line test"
    fi
fi

echo ""

# 4. Test Laravel database connection
echo "🔍 Step 4: Testing Laravel database connection..."
if [ -f "artisan" ]; then
    php artisan tinker --execute="
    try {
        \$pdo = DB::connection()->getPdo();
        echo '✅ Laravel database connection successful';
        echo PHP_EOL . '   Connected to: ' . DB::connection()->getDatabaseName();
    } catch (PDOException \$e) {
        echo '❌ Laravel database connection failed';
        echo PHP_EOL . '   Error: ' . \$e->getMessage();
        echo PHP_EOL . '   Code: ' . \$e->getCode();
    } catch (Exception \$e) {
        echo '❌ Laravel database connection failed';
        echo PHP_EOL . '   Error: ' . \$e->getMessage();
    }
    " 2>&1
else
    echo "⚠️  artisan file not found, skipping Laravel connection test"
fi

echo ""

# 5. Check if database exists
echo "🔍 Step 5: Checking if database exists..."
if [ -f ".env" ] && [ -f "artisan" ]; then
    DB_DATABASE=$(grep "^DB_DATABASE=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_USERNAME=$(grep "^DB_USERNAME=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3306")
    
    if command -v mysql &> /dev/null; then
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "USE \`$DB_DATABASE\`;" 2>/dev/null; then
            echo "✅ Database '$DB_DATABASE' exists and is accessible"
        else
            echo "❌ Database '$DB_DATABASE' does not exist or is not accessible"
            echo "   You may need to create it:"
            echo "   mysql -u $DB_USERNAME -p -e \"CREATE DATABASE $DB_DATABASE;\""
        fi
    fi
fi

echo ""

# 6. Check MySQL socket (if using localhost)
echo "🔍 Step 6: Checking MySQL socket configuration..."
if [ -f ".env" ]; then
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ "$DB_HOST" = "127.0.0.1" ] || [ "$DB_HOST" = "localhost" ]; then
        echo "   Using localhost connection"
        if [ -S "/var/run/mysqld/mysqld.sock" ] || [ -S "/tmp/mysql.sock" ]; then
            echo "✅ MySQL socket found"
        else
            echo "⚠️  MySQL socket not found in common locations"
            echo "   You might need to use DB_SOCKET in .env"
        fi
    fi
fi

echo ""

# 7. Check network connectivity
echo "🔍 Step 7: Checking network connectivity to database host..."
if [ -f ".env" ]; then
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3306")
    
    if command -v nc &> /dev/null || command -v telnet &> /dev/null; then
        if timeout 2 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
            echo "✅ Port $DB_PORT is open on $DB_HOST"
        else
            echo "❌ Cannot connect to $DB_HOST:$DB_PORT"
            echo "   The database server may not be accepting connections"
        fi
    else
        echo "⚠️  Network tools not available, skipping port check"
    fi
fi

echo ""
echo "======================================"
echo "🎉 Diagnostic completed!"
echo ""
echo "Common fixes for 'Connection refused' errors:"
echo "1. Start MySQL service: sudo systemctl start mysql"
echo "2. Verify database credentials in .env file"
echo "3. Ensure database exists: mysql -u root -p -e 'CREATE DATABASE your_db;'"
echo "4. Check MySQL bind-address in /etc/mysql/my.cnf (should be 0.0.0.0 or 127.0.0.1)"
echo "5. Restart MySQL: sudo systemctl restart mysql"
echo "6. Clear Laravel config cache: php artisan config:clear"
echo ""

