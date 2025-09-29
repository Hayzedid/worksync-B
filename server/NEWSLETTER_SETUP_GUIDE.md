# Newsletter Setup Guide

## 🚀 Database Setup

### 1. Run the Newsletter Migration

```bash
cd server
npm run migrate-newsletter
```

This will create the following tables:
- `newsletter_subscribers` - Stores subscriber information
- `newsletter_campaigns` - Stores email campaigns
- `newsletter_campaign_recipients` - Tracks campaign delivery
- `newsletter_templates` - Email templates

### 2. Verify Database Tables

After running the migration, you should see these tables in your database:
- newsletter_subscribers
- newsletter_campaigns  
- newsletter_campaign_recipients
- newsletter_templates

## 📧 Email Service Configuration

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. **Add to your environment variables**:
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=WorkSync <noreply@worksync.ng>
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up for SendGrid** (free tier available)
2. **Create an API Key** in SendGrid dashboard
3. **Update email service configuration** in `server/src/services/emailService.js`:
   ```javascript
   this.transporter = nodemailer.createTransporter({
     host: 'smtp.sendgrid.net',
     port: 587,
     auth: {
       user: 'apikey',
       pass: process.env.SENDGRID_API_KEY
     }
   });
   ```

### Option 3: Mailgun

1. **Sign up for Mailgun**
2. **Get SMTP credentials** from Mailgun dashboard
3. **Update email service configuration**:
   ```javascript
   this.transporter = nodemailer.createTransporter({
     host: 'smtp.mailgun.org',
     port: 587,
     auth: {
       user: process.env.MAILGUN_SMTP_USER,
       pass: process.env.MAILGUN_SMTP_PASS
     }
   });
   ```

### Option 4: AWS SES

1. **Set up AWS SES**
2. **Verify your domain/email**
3. **Get SMTP credentials**
4. **Update email service configuration**:
   ```javascript
   this.transporter = nodemailer.createTransporter({
     host: 'email-smtp.us-east-1.amazonaws.com',
     port: 587,
     auth: {
       user: process.env.AWS_SES_SMTP_USER,
       pass: process.env.AWS_SES_SMTP_PASS
     }
   });
   ```

## 🔧 Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=WorkSync <noreply@worksync.ng>

# For SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# For Mailgun
MAILGUN_SMTP_USER=your-mailgun-smtp-user
MAILGUN_SMTP_PASS=your-mailgun-smtp-pass

# For AWS SES
AWS_SES_SMTP_USER=your-aws-ses-smtp-user
AWS_SES_SMTP_PASS=your-aws-ses-smtp-pass
```

## 🧪 Testing the Newsletter

### 1. Test Subscription

```bash
curl -X POST http://localhost:3000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "Test", "lastName": "User"}'
```

### 2. Check Subscription Status

```bash
curl "http://localhost:3000/api/newsletter/status?email=test@example.com"
```

### 3. Get Subscribers (Admin)

```bash
curl "http://localhost:3000/api/newsletter/subscribers"
```

### 4. Get Newsletter Stats

```bash
curl "http://localhost:3000/api/newsletter/stats"
```

## 📊 Newsletter Features

### ✅ Implemented Features

- **Email Subscription** - Users can subscribe with email validation
- **Welcome Emails** - Automatic welcome email sent to new subscribers
- **Duplicate Prevention** - Prevents duplicate email subscriptions
- **Unsubscribe** - Users can unsubscribe from the newsletter
- **Database Storage** - All subscribers stored in MySQL database
- **Email Templates** - Professional HTML email templates
- **Statistics** - Track subscriber count and engagement
- **Admin Endpoints** - View subscribers and manage campaigns

### 🚀 Future Enhancements

- **Email Campaigns** - Send newsletters to all subscribers
- **Segmentation** - Group subscribers by preferences
- **Analytics** - Track open rates, click rates, etc.
- **A/B Testing** - Test different email templates
- **Automation** - Automated email sequences
- **Integration** - Connect with email marketing services

## 🎨 Email Templates

The system includes a professional welcome email template with:
- Responsive design
- WorkSync branding
- Social media links
- Unsubscribe options
- Professional styling

## 🔒 Security Features

- **Email Validation** - Server-side email format validation
- **Rate Limiting** - Prevents spam subscriptions
- **Input Sanitization** - All inputs are sanitized
- **Error Handling** - Comprehensive error handling
- **Logging** - All activities are logged

## 📱 Frontend Integration

The newsletter signup is already integrated into your landing page:
- Form validation
- Loading states
- Success/error messages
- Real-time feedback

## 🛠️ Troubleshooting

### Common Issues

1. **Email not sending**:
   - Check email credentials
   - Verify SMTP settings
   - Check firewall/network restrictions

2. **Database connection errors**:
   - Verify database credentials
   - Ensure database is running
   - Check table permissions

3. **Migration fails**:
   - Check database permissions
   - Ensure database exists
   - Verify SQL syntax

### Debug Mode

In development, emails are logged to console instead of being sent. Check your server logs for email content.

## 📈 Monitoring

Monitor your newsletter performance:
- Subscriber growth rate
- Email delivery success
- Unsubscribe rates
- Engagement metrics

## 🎯 Next Steps

1. **Run the migration**: `npm run migrate-newsletter`
2. **Configure email service** with your preferred provider
3. **Test the subscription** using the API endpoints
4. **Monitor the logs** for any issues
5. **Customize email templates** as needed

Your newsletter system is now ready to collect and manage subscriber emails! 🎉
