import dotenv from 'dotenv';
import { sendEmail } from './src/services/emailServices.js';

// Load environment variables from .env file
dotenv.config();

async function testEmailConfiguration() {
  try {
    console.log('🧪 Testing email configuration...');
    console.log('📧 Current email settings:');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***CONFIGURED***' : 'NOT SET');
    console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
    console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || '587');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('\n⚠️  Email credentials not configured!');
      console.log('📋 To configure:');
      console.log('1. Follow the setup guide in EMAIL_SETUP_GUIDE.md');
      console.log('2. Update your .env file with your Gmail credentials');
      console.log('3. Restart the server');
      console.log('4. Run this test again');
      return;
    }
    
    if (process.env.EMAIL_PASSWORD === 'your-16-character-app-password') {
      console.log('\n⚠️  Please replace the placeholder app password with your real Gmail App Password');
      console.log('📋 Get your app password from: https://myaccount.google.com/security');
      return;
    }
    
    console.log('\n📤 Sending test email...');
    const result = await sendEmail({
      to: process.env.EMAIL_USER, // Send test email to yourself
      subject: 'WorkSync Email Test - Configuration Successful!',
      text: `Congratulations! Your WorkSync email configuration is working correctly.
      
This test email confirms that:
✅ Gmail App Password is configured
✅ SMTP connection is working
✅ Emails can be sent successfully

Your WorkSync application can now send:
- Password reset emails
- Workspace invitation emails
- Task reminder emails
- Newsletter subscriptions

Sent at: ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0FC2C0;">🎉 WorkSync Email Test Successful!</h2>
          <p>Congratulations! Your WorkSync email configuration is working correctly.</p>
          
          <div style="background: #F6FFFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #015958;">This test confirms:</h3>
            <ul style="color: #015958;">
              <li>✅ Gmail App Password is configured</li>
              <li>✅ SMTP connection is working</li>
              <li>✅ Emails can be sent successfully</li>
            </ul>
          </div>
          
          <p style="color: #0CABA8;"><strong>Your WorkSync application can now send:</strong></p>
          <ul style="color: #015958;">
            <li>Password reset emails</li>
            <li>Workspace invitation emails</li>
            <li>Task reminder emails</li>
            <li>Newsletter subscriptions</li>
          </ul>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox for the test email');
      console.log('🎉 Your email configuration is working correctly!');
    } else {
      console.log('❌ Email sending failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure 2FA is enabled on your Gmail account');
    console.log('2. Generate a new App Password from Google Account settings');
    console.log('3. Double-check your email and app password in .env file');
    console.log('4. Restart the server after updating .env');
  } finally {
    process.exit(0);
  }
}

testEmailConfiguration();