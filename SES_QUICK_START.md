# Amazon SES Quick Start

## Quick Setup (3 Steps)

### 1. Add AWS Credentials to `.env`

Add these lines to your `.env` file:

```env
MAIL_MAILER=ses
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_DEFAULT_REGION=us-east-1
```

**Important:** 
- Replace `your-access-key-id` and `your-secret-access-key` with your actual AWS credentials
- Change `us-east-1` to your SES region if different
- Make sure your `MAIL_FROM_ADDRESS` in `.env` is a verified email/domain in SES

### 2. Clear Config Cache

```bash
php artisan config:clear
```

### 3. Test It

```bash
php artisan ses:test your-email@example.com
```

Replace `your-email@example.com` with your actual email address to receive a test email.

## Your System Already Has:

✅ Email notification system (`NotificationService`)
✅ Mailable classes for late medications and vital signs
✅ Facility-specific email configuration support
✅ AWS SDK already installed

## Current Email Features

Your application already sends:
- **Late Medication Notifications** - When medications are overdue
- **Late Vital Sign Notifications** - When vital signs are overdue

These will automatically use SES once you configure it!

## Facility-Specific Configuration

Your system supports per-facility email settings. Facilities can have their own:
- From address
- From name  
- SES region override
- Configuration set

This is handled automatically by `MailConfigurationService`.

## Need Help?

See `AMAZON_SES_SETUP.md` for detailed instructions and troubleshooting.

