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
const transporter = nodemailer.createTransport(gmailConfig);

// Export transporter for application use. Do not auto-send test emails from checked-in files.
export { transporter };

/*
  Usage (local only):
  - Create a local, untracked `server/.env` with real credentials.
  - Then run a one-off test from your machine (do NOT commit test scripts that contain real creds):

    import { transporter } from './email-config.js';

    async function testEmailLocal() {
      await transporter.verify();
      await transporter.sendMail({
        from: 'WorkSync <noreply@worksync.ng>',
        to: 'you@example.com', // replace with a real address you control
        subject: 'Test Email',
        text: 'This is a local test email.'
      });
      console.log('Local test email sent');
    }

  This keeps the repository free of hard-coded recipient addresses and passwords.
*/
