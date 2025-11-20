# 🌱 Production Seeder Guide

## How to Access/Run Seeders on Production

This guide explains how to safely run seeders on your production server to populate data.

---

## ⚠️ Important Safety Notes

1. **Backup First**: Always backup your database before running seeders
2. **Test Environment**: Test seeders in a staging environment first if possible
3. **Low Traffic**: Run during low-traffic periods
4. **Dry Run**: Consider running with `--force` flag to bypass confirmation prompts
5. **Idempotent**: Most seeders use `firstOrCreate()` so they won't create duplicates

---

## 🚀 Methods to Run Seeders on Production

### Method 1: SSH into Production Server (Recommended)

#### Step 1: Connect to Production Server

```bash
# SSH into your production server (Laravel Forge, VPS, etc.)
ssh forge@your-server-ip
# or
ssh your-username@your-domain.com
```

#### Step 2: Navigate to Project Directory

```bash
cd /home/forge/your-site.com  # Laravel Forge
# or wherever your Laravel project is located
```

#### Step 3: Run Seeders

**Option A: Run Essential Seeders (Recommended for Production)**

```bash
# 1. Create Super Admin (if not exists)
php artisan db:seed --class=SuperAdminSeeder --force

# 2. Create Facilities and Branches
php artisan db:seed --class=FacilitySeeder --force
php artisan db:seed --class=BranchSeeder --force

# 3. Create Facility Admin Users
php artisan db:seed --class=FacilityAdminSeeder --force

# 4. Create Roles and Permissions (if needed)
php artisan db:seed --class=RoleSeeder --force
php artisan db:seed --class=PermissionSeeder --force
php artisan db:seed --class=RolePermissionSeeder --force

# 5. Create Vital Ranges (if needed)
php artisan db:seed --class=VitalRangeSeeder --force
```

**Option B: Run Full Seeder Suite (Creates Test Data)**

```bash
# This creates test data including residents, caregivers, etc.
# ⚠️ WARNING: Only use this if you want test/demo data in production

# Run in order:
php artisan db:seed --class=FacilitySeeder --force
php artisan db:seed --class=BranchSeeder --force
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=FacilityAdminSeeder --force
php artisan db:seed --class=ResidentSeeder --force
php artisan db:seed --class=CaregiverSeeder --force

# Optional: Additional seeders
php artisan db:seed --class=MedicationSeeder --force
php artisan db:seed --class=AppointmentSeeder --force
php artisan db:seed --class=AssessmentSeeder --force
```

**Option C: Run Unified Production Seeder (Minimal Production Setup)**

```bash
# This creates essential production data without test data
php artisan db:seed --class=UnifiedProductionSeeder --force
```

---

### Method 2: Using Laravel Forge Deployment Script

If you're using Laravel Forge, you can add seeder commands to your deployment script:

#### Access Forge Dashboard:
1. Go to your site → **Deploy Script**
2. Add seeder commands after migrations:

```bash
# Add these lines to your deployment script:
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=FacilityAdminSeeder --force
```

**⚠️ Note**: This runs on EVERY deployment. Only add seeders that are safe to run multiple times.

---

### Method 3: Using Artisan Tinker (Interactive)

For more control and to see what's happening:

```bash
# SSH into production
ssh forge@your-server

# Navigate to project
cd /home/forge/your-site.com

# Open Tinker
php artisan tinker

# Then run seeders interactively:
>>> (new \Database\Seeders\SuperAdminSeeder)->run();
>>> (new \Database\Seeders\FacilitySeeder)->run();
>>> (new \Database\Seeders\BranchSeeder)->run();
```

---

### Method 4: Via Deployment Script (Automated)

You can add to your existing deployment script:

```bash
# In deploy-multi-tenant.sh or your custom deployment script

# After migrations, add:
echo "🌱 Running essential seeders..."
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=FacilityAdminSeeder --force
```

---

## 📋 Recommended Production Seeder Sequence

For a fresh production deployment, run in this order:

```bash
# 1. Essential Setup
php artisan db:seed --class=SuperAdminSeeder --force

# 2. Facilities & Branches (if creating initial facility)
php artisan db:seed --class=FacilitySeeder --force
php artisan db:seed --class=BranchSeeder --force

# 3. Facility Admin Accounts
php artisan db:seed --class=FacilityAdminSeeder --force

# 4. Roles & Permissions (if needed)
php artisan db:seed --class=RoleSeeder --force
php artisan db:seed --class=PermissionSeeder --force
php artisan db:seed --class=RolePermissionSeeder --force

# 5. System Data (if needed)
php artisan db:seed --class=VitalRangeSeeder --force
php artisan db:seed --class=HousekeepingSeeder --force
```

**For test/demo data, add:**
```bash
php artisan db:seed --class=ResidentSeeder --force
php artisan db:seed --class=CaregiverSeeder --force
php artisan db:seed --class=MedicationSeeder --force
```

---

## ✅ Verify Seeders Ran Successfully

After running seeders, verify they worked:

```bash
php artisan tinker --execute="
echo '=== SEEDER VERIFICATION ===' . PHP_EOL;
echo 'Facilities: ' . App\Models\Facility::count() . PHP_EOL;
echo 'Branches: ' . App\Models\Branch::count() . PHP_EOL;
echo 'Users: ' . App\Models\User::count() . PHP_EOL;
echo 'Super Admin: ' . (App\Models\User::where('role', 'super_admin')->exists() ? 'YES' : 'NO') . PHP_EOL;
echo 'Residents: ' . App\Models\Resident::count() . PHP_EOL;
"
```

Or interactively:
```bash
php artisan tinker
>>> App\Models\Facility::count()
>>> App\Models\Branch::count()
>>> App\Models\User::where('role', 'super_admin')->first()
```

---

## 🔍 Individual Seeder Descriptions

### Essential Seeders (Safe for Production)

| Seeder | Purpose | Creates |
|--------|---------|---------|
| `SuperAdminSeeder` | Super admin account | Super admin user |
| `FacilitySeeder` | Initial facilities | Evergreen Oasis, Bothell Serenity |
| `BranchSeeder` | Facility branches | 6 branches for Evergreen, 3 for Bothell |
| `FacilityAdminSeeder` | Facility admin accounts | Admin user for each facility |
| `RoleSeeder` | User roles | Administrator, Caregiver, Nurse roles |
| `PermissionSeeder` | System permissions | All permission definitions |
| `VitalRangeSeeder` | Vital sign ranges | Blood pressure, temperature ranges |

### Test/Demo Data Seeders (Use with Caution)

| Seeder | Purpose | Creates |
|--------|---------|---------|
| `ResidentSeeder` | Test residents | 28 residents across facilities |
| `CaregiverSeeder` | Test caregivers | 8 caregiver users |
| `MedicationSeeder` | Test medications | Sample medications |
| `AppointmentSeeder` | Test appointments | Sample appointments |
| `AssessmentSeeder` | Test assessments | Sample assessments |

---

## 🛡️ Safety Best Practices

### 1. Backup Before Seeding

```bash
# MySQL/MariaDB backup
mysqldump -u your_user -p your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Laravel Backup (if installed)
php artisan backup:run
```

### 2. Run Seeders One at a Time

Don't run all seeders at once. Run them individually to catch errors:

```bash
# Good - Run individually
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=FacilitySeeder --force

# Risky - All at once
php artisan db:seed --force  # Only if you know what you're doing
```

### 3. Use `--force` Flag

In production, use `--force` to bypass confirmation prompts:

```bash
php artisan db:seed --class=SuperAdminSeeder --force
```

### 4. Check Environment

Always verify you're on the right server:

```bash
# Check current environment
php artisan env

# Or check .env
cat .env | grep APP_ENV
```

---

## 🚨 Troubleshooting

### Seeder Fails with "Class not found"

```bash
# Regenerate autoload files
composer dump-autoload
```

### Seeder Creates Duplicates

Most seeders use `firstOrCreate()` which prevents duplicates. If you still get duplicates:

```bash
# Check existing data first
php artisan tinker
>>> App\Models\Facility::count()
```

### Permission Denied Errors

```bash
# Fix permissions
chmod -R 775 storage bootstrap/cache
chown -R forge:forge storage bootstrap/cache  # Adjust user/group
```

### Database Connection Errors

```bash
# Test database connection
php artisan migrate:status

# Check .env file
cat .env | grep DB_
```

---

## 📝 Quick Reference Commands

```bash
# Essential seeders (production-safe)
php artisan db:seed --class=SuperAdminSeeder --force
php artisan db:seed --class=FacilitySeeder --force
php artisan db:seed --class=BranchSeeder --force
php artisan db:seed --class=FacilityAdminSeeder --force

# Full seeder suite (creates test data)
php artisan db:seed --force

# Check what was created
php artisan tinker --execute="echo 'Facilities: ' . App\Models\Facility::count();"
```

---

## 🎯 What to Run for Your First Production Setup

**Minimal Setup (Recommended for Production):**

```bash
# 1. Super Admin
php artisan db:seed --class=SuperAdminSeeder --force

# 2. Create your first facility via UI or:
php artisan db:seed --class=FacilitySeeder --force
php artisan db:seed --class=BranchSeeder --force

# 3. Facility Admins
php artisan db:seed --class=FacilityAdminSeeder --force
```

**Then log in as super admin and:**
- Create facilities through the admin panel
- Set up facility branding
- Create facility owner accounts

---

## 📞 Need Help?

If seeders fail:
1. Check error messages carefully
2. Verify database connection
3. Ensure migrations have run
4. Check file permissions
5. Review seeder logs

**Remember**: Most seeders are idempotent (safe to run multiple times) but some create test data that may duplicate.

