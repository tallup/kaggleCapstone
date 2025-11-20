# 🔐 Production Password Security Guide

## ⚠️ CRITICAL: Change All Default Passwords Before Production Deployment

**DO NOT use default passwords (`password`) in production!**

---

## 🔒 Pre-Production Security Checklist

### 1. Change Super Admin Password

```bash
php artisan tinker
```

Then in tinker:
```php
$user = App\Models\User::where('email', 'superadmin@evergreen.com')->first();
$user->password = Hash::make('YourStrongPassword123!@#');
$user->save();
echo "✅ Super admin password updated";
```

### 2. Change All Facility Admin Passwords

**Option A: Update via Tinker (recommended for specific accounts)**

```php
// For each facility admin
$user = App\Models\User::where('email', 'admin@evergreenoasiscarehome.com')->first();
$user->password = Hash::make('StrongUniquePassword123!');
$user->save();

// Repeat for each admin email...
```

**Option B: Create a seeder script for bulk update**

Create a custom seeder or use the password reset feature after deployment.

### 3. Reset Caregiver/Staff Passwords

All staff members should reset their passwords on first login, or you can:
- Use password reset functionality
- Set temporary passwords and require change on first login

---

## ✅ Password Requirements for Production

- **Minimum 12 characters** (recommended: 16+)
- **Mix of uppercase and lowercase letters**
- **At least one number**
- **At least one special character** (!@#$%^&*)
- **Unique passwords** for each account
- **Never reuse passwords** across accounts

### Example Strong Passwords:
- ✅ `Ev3rgr33n@2025!Secure`
- ✅ `B0th3ll$Admin#Secure2025`
- ✅ `SuperAdm!n@Syst3m#2025`

---

## 🛡️ Security Best Practices

### 1. Use Environment-Specific Passwords

Store initial passwords in `.env` file (never commit to git):

```env
SUPER_ADMIN_PASSWORD=YourStrongPassword123!@#
FACILITY_ADMIN_PASSWORD=AnotherStrongPassword456!@#
```

### 2. Enable Password Expiration (Optional)

Consider implementing password expiration policies:
- Require password change every 90 days
- Force password change on first login
- Prevent password reuse

### 3. Use Two-Factor Authentication (2FA)

For highly sensitive accounts (super admin), consider adding 2FA:
- Email verification
- SMS verification
- Authenticator apps (Google Authenticator, Authy)

### 4. Secure Password Reset

Ensure password reset functionality:
- Uses secure tokens
- Expires after short time period
- Sent via secure channels
- Requires email verification

---

## 📝 Production Deployment Steps

### Step 1: Deploy Code
```bash
git pull origin multi-tenant
composer install --optimize-autoloader --no-dev
npm ci && npm run build
php artisan migrate --force
```

### Step 2: Create/Update Super Admin
```bash
php artisan db:seed --class=SuperAdminSeeder
```

### Step 3: **IMMEDIATELY** Change Super Admin Password
```bash
php artisan tinker
```
```php
$user = App\Models\User::where('email', 'superadmin@evergreen.com')->first();
$user->password = Hash::make(env('SUPER_ADMIN_PASSWORD', 'TempPassword123!ChangeMe'));
$user->save();
```

### Step 4: Create Facility Accounts with Strong Passwords

When creating facilities through the admin panel:
- Use strong, unique passwords for each facility owner
- Document passwords securely (password manager)
- Never share via email or insecure channels

### Step 5: Force Password Reset for All Users

Implement a script to mark all users as needing password reset:

```php
// In a migration or command
User::where('password', 'LIKE', '$2y$%')->update(['force_password_reset' => true]);
```

Then require password change on first login.

---

## 🚨 Security Audit Checklist

Before going live, verify:

- [ ] All default passwords changed
- [ ] Super admin password is strong and unique
- [ ] Facility admin passwords are strong and unique
- [ ] No passwords in version control (git)
- [ ] `.env` file is not accessible publicly
- [ ] Database backups are encrypted
- [ ] SSL/HTTPS is enabled
- [ ] Password reset functionality works
- [ ] Failed login attempt logging is enabled
- [ ] Account lockout after failed attempts is configured

---

## 🔧 Quick Password Update Script

Create a custom Artisan command for password updates:

```bash
php artisan make:command UpdateUserPassword
```

Then implement:
```php
protected $signature = 'user:update-password {email} {password}';
protected $description = 'Update user password securely';

public function handle()
{
    $email = $this->argument('email');
    $password = $this->argument('password');
    
    $user = User::where('email', $email)->first();
    
    if (!$user) {
        $this->error("User not found: {$email}");
        return 1;
    }
    
    $user->password = Hash::make($password);
    $user->save();
    
    $this->info("✅ Password updated for: {$email}");
    return 0;
}
```

Usage:
```bash
php artisan user:update-password superadmin@evergreen.com "NewStrongPassword123!@#"
```

---

## 📞 Emergency Password Reset

If you need to reset a password in production:

1. **Via Tinker (if you have server access):**
   ```bash
   php artisan tinker
   $user = User::where('email', 'user@example.com')->first();
   $user->password = Hash::make('TemporaryPassword123!');
   $user->save();
   ```

2. **Via Database (last resort):**
   ```sql
   UPDATE users 
   SET password = '$2y$10$...hashed.password...' 
   WHERE email = 'user@example.com';
   ```

---

## ⚡ Summary

**NEVER use default passwords in production!**

1. ✅ Change super admin password immediately after deployment
2. ✅ Use strong, unique passwords (12+ characters, mixed case, numbers, symbols)
3. ✅ Enable HTTPS/SSL
4. ✅ Implement password reset functionality
5. ✅ Consider 2FA for sensitive accounts
6. ✅ Regular security audits

**Security is not optional - protect your data and your users!**

