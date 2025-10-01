// Gmail Email Configuration for WorkSync Newsletter
// This will send real emails to subscribers

import nodemailer from 'nodemailer';

// Gmail SMTP Configuration
const gmailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,     // Gmail address from environment variable
    pass: process.env.GMAIL_APP_PASS  // App Password from environment variable
  }
};

// Create transporter
const transporter = nodemailer.createTransporter(gmailConfig);

// Test email function
async function testEmail() {
  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully!');
    
    // Send test email
    const mailOptions = {
      from: 'WorkSync <noreply@worksync.ng>',
      to: 'iazeez775@gmail.com',
      subject: 'Test Email from WorkSync Newsletter System',
      html: `
        <h2>🎉 Test Email Successful!</h2>
        <p>This is a test email from the WorkSync newsletter system.</p>
        <p>If you received this email, the system is working correctly!</p>
        <br>
        <p>Best regards,<br>WorkSync Team</p>
      `,
      text: `
        Test Email Successful!
        
        This is a test email from the WorkSync newsletter system.
        If you received this email, the system is working correctly!
        
        Best regards,
        WorkSync Team
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Email sent to: iazeez775@gmail.com');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Go to your Google Account settings');
    console.log('2. Enable 2-Factor Authentication');
    console.log('3. Generate an App Password for "Mail"');
    console.log('4. Replace the credentials in this file');
    console.log('5. Run: node email-config.js');
  }
}

// Run the test
testEmail();
