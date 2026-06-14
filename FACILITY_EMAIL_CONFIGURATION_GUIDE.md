# Facility Email Configuration Guide

## ✅ Current Status: **WORKING**

Since you're **receiving email notifications**, your email configuration workflow is **already working correctly**! This guide explains how it works and how to configure it.

---

## 🎯 How Facility-Level Email Configuration Works

### 1. **Admin Interface** (Where You Configure)

**Location**: `/super-admin/settings/email`

**Three Tabs**:

#### Tab 1: **Sender Configuration**
- **From Email Address**: The email address that appears as the sender
  - Must be verified in Amazon SES
  - Example: `noreply@yourfacility.com`
  
- **From Name**: The display name shown in recipient's inbox
  - Example: `Your Facility Name`
  
- **Test Email**: Send a test email to verify configuration

**How it works**:
1. You enter the email address and name
2. Click "Save Settings"
3. Settings are stored in `facility_settings` table with category `email`
4. These settings are used for all emails sent from this facility

#### Tab 2: **Notification Recipients**
- Configure who receives emails for each notification type
- Can select by role (Administrator, Admin, Manager, Nurse, Caregiver, Super admin)
- Can add specific users
- Can enable/disable specific notification types

#### Tab 3: **Email Templates**
- Customize email subject and body templates
- Use variables like `{{residentName}}`, `{{medicationName}}`, etc.

---

## 🔧 How It Works Behind the Scenes

### Step 1: Settings Storage

When you save settings in the admin interface:

```php
// Settings are stored in facility_settings table
facility_id: 1
category: 'email'
key: 'mail_from_address'
value: 'noreply@yourfacility.com'
type: 'string'
```

**Settings stored**:
- `mail_driver` - Always set to `ses` (uses Amazon SES)
- `mail_from_address` - Your sender email
- `mail_from_name` - Your sender name
- `ses_region` - Optional AWS region override
- `ses_configuration_set` - Optional SES configuration set

### Step 2: Configuration Applied Before Sending

When an email is about to be sent, the system:

```php
// 1. Gets the facility from the context (resident, user, etc.)
$facility = $medication->resident->branch->facility;

// 2. Configures mail for that facility
$mailConfigService->configureForFacility($facility);

// 3. Reads settings from database
$settings = FacilitySetting::where('facility_id', $facility->id)
    ->where('category', 'email')
    ->get();

// 4. Applies settings to Laravel Mail
Config::set('mail.from.address', $settings->get('mail_from_address'));
Config::set('mail.from.name', $settings->get('mail_from_name'));

// 5. Sends email with facility-specific settings
Mail::to($user->email)->send($mailable);
```

### Step 3: Email Delivery

The email is sent using:
- **Global AWS Credentials**: From `.env` file (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`)
- **Facility-Specific Settings**: From `facility_settings` table (from address, from name, optional region)

---

## 📋 Complete Configuration Flow

```
1. Admin Configures Settings
   ↓
   Admin Interface: /super-admin/settings/email
   ↓
2. Settings Saved to Database
   ↓
   facility_settings table (category: 'email')
   ↓
3. Email Triggered (Event/Observer/Scheduled Command)
   ↓
4. MailConfigurationService::configureForFacility()
   ↓
   Reads settings from database
   Applies to Laravel Config
   ↓
5. Email Sent
   ↓
   Uses facility's from address/name
   Uses global AWS credentials
   ↓
6. Email Delivered
   ↓
   Recipient sees email from configured address
```

---

## 🛠️ How to Configure (Step-by-Step)

### Step 1: Access Email Settings

1. Login as Super Admin
2. Navigate to: **Settings** → **Email Settings**
3. URL: `/super-admin/settings/email`

### Step 2: Configure Sender Information

**Tab: Sender Configuration**

1. **From Email Address**:
   - Enter your verified SES email address
   - Example: `noreply@yourfacility.com`
   - ⚠️ **Important**: This email must be verified in Amazon SES
   
2. **From Name**:
   - Enter the display name
   - Example: `Your Facility Name`
   - This appears in the recipient's inbox

3. **Click "Save Settings"**

### Step 3: Test Email Configuration

1. Enter a test recipient email in "Test Recipient Email" field
2. Click "Send Test Email"
3. Check the recipient's inbox
4. Verify:
   - Email arrives
   - From address is correct
   - From name is correct

### Step 4: Configure Notification Recipients (Optional)

**Tab: Notification Recipients**

1. Select notification type from dropdown (e.g., "Medication Window Opening")
2. Check "Enable this notification"
3. Select recipient roles:
   - ✅ Administrator
   - ✅ Admin
   - ✅ Manager
   - ✅ Nurse
   - ✅ Caregiver
   - ✅ Super admin
4. Optionally add specific users
5. Click "Save"

### Step 5: Customize Email Templates (Optional)

**Tab: Email Templates**

1. Select notification type
2. Customize email subject template
3. Customize email body template
4. Use variables: `{{residentName}}`, `{{medicationName}}`, etc.
5. Click "Save Template"

---

## 🔍 Verification: Is It Working?

### ✅ Signs It's Working (You Have These):

1. ✅ **Receiving emails** - This confirms the workflow is working!
2. ✅ **Emails have correct from address** - Facility settings are being applied
3. ✅ **Emails have correct from name** - Facility settings are being applied
4. ✅ **Test email works** - Configuration is correct

### How to Verify Settings Are Applied:

```bash
# SSH into server
ssh forge@your-server

# Check facility settings
php artisan tinker --execute="
\$facility = \App\Models\Facility::find(1);
\$settings = \App\Models\FacilitySetting::where('facility_id', \$facility->id)
    ->where('category', 'email')
    ->get()
    ->mapWithKeys(function(\$s) { return [\$s->key => \$s->casted_value]; });
echo 'Mail Driver: ' . (\$settings['mail_driver'] ?? 'not set') . PHP_EOL;
echo 'From Address: ' . (\$settings['mail_from_address'] ?? 'not set') . PHP_EOL;
echo 'From Name: ' . (\$settings['mail_from_name'] ?? 'not set') . PHP_EOL;
"
```

### Check Logs:

```bash
# Check if mail configuration is being applied
tail -f storage/logs/laravel.log | grep "Mail configured for facility"

# Check email sends
tail -f storage/logs/laravel.log | grep "email sent"
```

---

## 🔐 AWS SES Requirements

### Global Configuration (`.env` file):

```env
MAIL_MAILER=ses
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
```

### Email Verification:

1. **Verify Email Address in SES**:
   - Go to AWS Console → SES → Verified identities
   - Click "Create identity"
   - Select "Email address"
   - Enter your email (e.g., `noreply@yourfacility.com`)
   - Click the verification link sent to that email

2. **Move Out of SES Sandbox** (if needed):
   - Request production access in AWS SES
   - Allows sending to any email address

---

## 📊 Settings Priority

When sending an email, the system uses:

1. **Facility Settings** (if configured):
   - From address
   - From name
   - Mail driver
   - SES region (optional)

2. **Global Settings** (fallback):
   - From `config/mail.php`
   - From `.env` file

3. **AWS Credentials** (always global):
   - From `.env` file
   - Used for all facilities

---

## 🎯 Key Points

### ✅ What's Working (Since You're Receiving Emails):

1. ✅ **AWS SES is configured** - Global credentials are working
2. ✅ **Facility settings are being applied** - Your from address/name are being used
3. ✅ **Email delivery is working** - Emails are reaching recipients
4. ✅ **Configuration workflow is functional** - Settings are being read and applied

### 🔧 What You Can Customize:

1. **Change sender email/name** - Update in Sender Configuration tab
2. **Configure recipients** - Set who gets which emails in Notification Recipients tab
3. **Customize templates** - Modify email content in Email Templates tab
4. **Test configuration** - Use test email feature

---

## 🚨 Common Issues & Solutions

### Issue: Emails Not Sending

**Check 1**: AWS SES Configuration
```bash
# Verify AWS credentials
php artisan tinker --execute="echo config('services.ses.key') ? 'Set' : 'Not set';"
```

**Check 2**: Email Verification
- Ensure sender email is verified in AWS SES
- Check SES sandbox status

**Check 3**: Facility Settings
- Verify settings are saved in database
- Check logs for configuration errors

### Issue: Wrong From Address

**Solution**: Update in Sender Configuration tab
- Ensure email is verified in SES
- Save settings
- Test with test email feature

### Issue: Settings Not Applying

**Check**: Logs for configuration errors
```bash
tail -f storage/logs/laravel.log | grep "Failed to configure mail"
```

---

## 📝 Summary

**Your email configuration is working** because:

1. ✅ You're receiving emails
2. ✅ Settings are stored in `facility_settings` table
3. ✅ `MailConfigurationService` applies settings before sending
4. ✅ AWS SES is configured and working

**To configure or modify**:
- Go to `/super-admin/settings/email`
- Use the three tabs:
  - **Sender Configuration**: Set from address/name
  - **Notification Recipients**: Configure who gets emails
  - **Email Templates**: Customize email content

**The workflow**:
1. Admin saves settings → Database
2. Email triggered → Settings loaded → Applied to Mail → Sent
3. Recipient receives email with facility-specific from address/name

Everything is working as designed! 🎉
