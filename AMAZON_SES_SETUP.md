# Amazon SES Setup Guide

## Prerequisites
You have Amazon SES production access, which means you can send emails to any recipient (not just verified addresses).

## Step 1: Get Your AWS Credentials

1. Log into the AWS Console
2. Go to IAM (Identity and Access Management)
3. Create a new user or use an existing one with SES permissions
4. Create an Access Key ID and Secret Access Key
5. Ensure the user has the `AmazonSESFullAccess` policy (or at minimum, `ses:SendEmail` and `ses:SendRawEmail` permissions)

## Step 2: Configure Your .env File

Add the following to your `.env` file:

```env
# Mail Configuration
MAIL_MAILER=ses
MAIL_FROM_ADDRESS="your-verified-email@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_DEFAULT_REGION=us-east-1
AWS_SES_CONFIGURATION_SET=optional-configuration-set-name
```

### Important Notes:
- **MAIL_MAILER**: Set to `ses` to use Amazon SES (you can also use `ses-v2` for the newer API)
- **MAIL_FROM_ADDRESS**: Must be a verified email address or domain in SES
- **AWS_DEFAULT_REGION**: Use the region where your SES is configured (common: `us-east-1`, `us-west-2`, `eu-west-1`)
- **AWS_SES_CONFIGURATION_SET**: Optional - only include if you have a configuration set set up in SES

## Step 3: Verify Your Email/Domain in SES

1. Go to Amazon SES Console
2. Navigate to "Verified identities"
3. Verify the email address or domain you'll use as the "From" address
4. If using a domain, set up DKIM and SPF records in your DNS

## Step 4: Test the Configuration

After updating your `.env` file, clear the config cache:

```bash
php artisan config:clear
```

## Step 5: Send Emails

Laravel makes it easy to send emails. Here are examples:

### Using Mail Facade

```php
use Illuminate\Support\Facades\Mail;

Mail::to('recipient@example.com')
    ->send(new \App\Mail\WelcomeMail());
```

### Using Mailable Class

Create a mailable:
```bash
php artisan make:mail WelcomeMail
```

Then use it:
```php
use App\Mail\WelcomeMail;
use Illuminate\Support\Facades\Mail;

Mail::to('user@example.com')->send(new WelcomeMail($user));
```

### Simple Text Email

```php
use Illuminate\Support\Facades\Mail;

Mail::raw('Hello, this is a test email!', function ($message) {
    $message->to('recipient@example.com')
            ->subject('Test Email');
});
```

## Troubleshooting

### Emails not sending?
1. Check your AWS credentials are correct
2. Verify the "From" email/domain is verified in SES
3. Check Laravel logs: `storage/logs/laravel.log`
4. Ensure you're not in SES sandbox mode (you mentioned you have production access)

### Rate Limits
- SES has sending limits based on your account
- Check your sending quota in the SES console
- Consider using Laravel queues for bulk emails

### Bounce/Complaint Handling
- Set up SNS topics in SES for bounces and complaints
- Configure webhooks to handle these events

## Security Best Practices

1. **Never commit `.env` to version control**
2. Use IAM roles instead of access keys when possible (e.g., on EC2)
3. Rotate access keys regularly
4. Use the minimum required permissions for your IAM user

