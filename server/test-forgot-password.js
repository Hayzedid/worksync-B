import { sendEmail } from './src/services/emailServices.js';

async function testForgotPasswordEmail() {
  try {
    console.log('🧪 Testing forgot password email functionality...');
    
    // Test email sending
    const testResult = await sendEmail({
      to: 'test@example.com',
      subject: 'Test - WorkSync Password Reset',
      text: 'This is a test email for password reset functionality. Reset link: https://frontend.com/reset-password/test-token\n\nThis link expires in 60 minutes.'
    });
    
    console.log('📧 Email test result:', testResult);
    
  } catch (error) {
    console.error('❌ Error testing forgot password email:', error);
  } finally {
    process.exit(0);
  }
}

testForgotPasswordEmail();