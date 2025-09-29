import nodemailer from 'nodemailer';
import { NODE_ENV } from '../config/config.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Check if Gmail credentials are provided
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Use Gmail for real email delivery
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log('📧 Gmail email service configured');
      } else {
        // Fallback to console logging for development
        console.log('⚠️  No email credentials found - emails will be logged to console');
        console.log('📝 To send real emails, set EMAIL_USER and EMAIL_PASS environment variables');
        this.transporter = null;
      }

      // Verify connection if transporter exists
      if (this.transporter) {
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.log('📝 Emails will be logged to console instead');
      // Fallback to console logging for development
      this.transporter = null;
    }
  }

  async sendEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      from = process.env.EMAIL_FROM || 'WorkSync <noreply@worksync.ng>'
    } = emailData;

    try {
      if (!this.transporter) {
        // Fallback: log email to console
        console.log('=== EMAIL WOULD BE SENT ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`From: ${from}`);
        console.log('HTML Content:', html);
        console.log('Text Content:', text);
        console.log('========================');
        return { success: true, messageId: 'console-log' };
      }

      const mailOptions = {
        from,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${result.messageId}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email, subscriberData = {}) {
    const { firstName = '', lastName = '' } = subscriberData;
    const fullName = `${firstName} ${lastName}`.trim() || 'there';

    const subject = 'Welcome to WorkSync Newsletter! 🎉';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WorkSync</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
        }
        .header p { 
            margin: 10px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px;
        }
        .content { 
            padding: 40px 30px; 
        }
        .content h2 { 
            color: #015958; 
            margin-top: 0; 
            font-size: 24px;
        }
        .content p { 
            margin-bottom: 20px; 
            font-size: 16px;
            color: #4a5568;
        }
        .features { 
            background: #f7fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
        }
        .features ul { 
            margin: 0; 
            padding-left: 20px; 
        }
        .features li { 
            margin-bottom: 8px; 
            color: #2d3748;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #0FC2C0, #015958); 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
        }
        .button:hover { 
            transform: translateY(-2px);
        }
        .footer { 
            background: #f8fafc; 
            padding: 30px; 
            text-align: center; 
            color: #718096; 
            font-size: 14px; 
            border-top: 1px solid #e2e8f0;
        }
        .footer a { 
            color: #0FC2C0; 
            text-decoration: none; 
        }
        .footer a:hover { 
            text-decoration: underline; 
        }
        .social-links { 
            margin: 20px 0; 
        }
        .social-links a { 
            display: inline-block; 
            margin: 0 10px; 
            color: #0FC2C0; 
            text-decoration: none; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to WorkSync! 🚀</h1>
            <p>Your productivity journey starts here</p>
        </div>
        <div class="content">
            <h2>Hi ${fullName}!</h2>
            <p>Thank you for subscribing to the WorkSync newsletter. We're thrilled to have you join our community of productivity enthusiasts!</p>
            
            <div class="features">
                <p><strong>What you'll receive:</strong></p>
                <ul>
                    <li>📈 Latest productivity tips and best practices</li>
                    <li>🚀 New feature announcements and updates</li>
                    <li>💡 Expert insights on team collaboration</li>
                    <li>🎯 Exclusive content and early access</li>
                    <li>📊 Industry trends and case studies</li>
                </ul>
            </div>

            <p>Ready to transform your workflow? WorkSync is the all-in-one productivity platform that helps teams plan, collaborate, and achieve more together.</p>
            
            <div style="text-align: center;">
                <a href="https://worksync.ng" class="button">Get Started with WorkSync</a>
            </div>

            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team at <a href="mailto:support@worksync.ng">support@worksync.ng</a>.</p>
            
            <p>Welcome aboard!</p>
            <p><strong>The WorkSync Team</strong></p>
        </div>
        <div class="footer">
            <div class="social-links">
                <a href="https://twitter.com/worksync">Twitter</a>
                <a href="https://linkedin.com/company/worksync">LinkedIn</a>
                <a href="https://github.com/worksync">GitHub</a>
            </div>
            <p><strong>WorkSync</strong> - All-in-One Productivity Platform</p>
            <p>Lagos, Nigeria | <a href="mailto:support@worksync.ng">support@worksync.ng</a></p>
            <p>
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | 
                <a href="{{preferences_url}}">Update Preferences</a>
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to WorkSync Newsletter!

Hi ${fullName}!

Thank you for subscribing to the WorkSync newsletter. We're thrilled to have you join our community of productivity enthusiasts!

What you'll receive:
- Latest productivity tips and best practices
- New feature announcements and updates  
- Expert insights on team collaboration
- Exclusive content and early access
- Industry trends and case studies

Ready to transform your workflow? WorkSync is the all-in-one productivity platform that helps teams plan, collaborate, and achieve more together.

Get started: https://worksync.ng

If you have any questions or need help getting started, don't hesitate to reach out to our support team at support@worksync.ng.

Welcome aboard!

The WorkSync Team

---
WorkSync - All-in-One Productivity Platform
Lagos, Nigeria | support@worksync.ng

Unsubscribe: {{unsubscribe_url}}
Update Preferences: {{preferences_url}}
`;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendNewsletterEmail(email, campaignData) {
    const { subject, html, text } = campaignData;
    
    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendUnsubscribeConfirmation(email) {
    const subject = 'You\'ve been unsubscribed from WorkSync Newsletter';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Unsubscribed from WorkSync</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>You've been unsubscribed</h2>
        </div>
        <div class="content">
            <p>You have successfully unsubscribed from the WorkSync newsletter.</p>
            <p>We're sorry to see you go! If you change your mind, you can always resubscribe by visiting our website.</p>
            <p>Thank you for being part of our community.</p>
        </div>
        <div class="footer">
            <p>WorkSync Team</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
You've been unsubscribed

You have successfully unsubscribed from the WorkSync newsletter.

We're sorry to see you go! If you change your mind, you can always resubscribe by visiting our website.

Thank you for being part of our community.

WorkSync Team
`;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }
}

// Create singleton instance
const emailService = new EmailService();
export default emailService;
