import nodemailer from 'nodemailer';

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Create email transporter
let transporter = null;

function createTransporter() {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
    }
  };

  // Validate email configuration
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.log('[EmailService] ⚠️  Email credentials not configured - using dummy mode');
    return null;
  }

  if (!isValidEmail(emailConfig.auth.user)) {
    console.log('[EmailService] ⚠️  Invalid email address in configuration - using dummy mode');
    return null;
  }

  if (emailConfig.auth.pass === 'your-app-password' || 
      emailConfig.auth.pass === 'your-app-password-here' || 
      emailConfig.auth.pass.length < 10) {
    console.log('[EmailService] ⚠️  Default/invalid app password detected - using dummy mode');
    console.log('[EmailService] 💡 Please set up a Gmail App Password in your .env file');
    return null;
  }

  try {
    transporter = nodemailer.createTransport(emailConfig);
    console.log(`[EmailService] ✅ Email transporter created successfully for: ${emailConfig.auth.user}`);
    return transporter;
  } catch (error) {
    console.error('[EmailService] ❌ Failed to create transporter:', error);
    return null;
  }
}

export async function sendEmail({ to, subject, text, html }) {
  // Validate recipient email
  if (!isValidEmail(to)) {
    console.error(`[EmailService] ❌ Invalid recipient email address: ${to}`);
    throw new Error(`Invalid email address: ${to}`);
  }

  const emailTransporter = createTransporter();
  
  if (!emailTransporter) {
    // Fallback to dummy implementation for development
    console.log(`[EmailService] 📧 DUMMY MODE - Would send email to: ${to}`);
    console.log(`[EmailService] 📬 Subject: ${subject}`);
    if (text) console.log(`[EmailService] 📝 Text Body:\n${text}`);
    if (html) console.log(`[EmailService] 🌐 HTML Body:\n${html.substring(0, 200)}...`);
    return { success: true, mode: 'dummy' };
  }

  try {
    const mailOptions = {
      from: `"WorkSync" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    };

    console.log(`[EmailService] 📤 Sending email to: ${to}`);
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email sent successfully to ${to}:`, info.messageId);
    return { success: true, mode: 'real', messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] ❌ Failed to send email to ${to}:`, error);
    throw error;
  }
}

export async function sendWorkspaceInvitation({ to, workspaceName, inviterName, inviteUrl, isExistingUser = true }) {
  const subject = `You've been invited to join ${workspaceName}`;
  
  let html, text;
  
  if (isExistingUser) {
    text = `Hi there!

${inviterName} has invited you to join the workspace "${workspaceName}" on WorkSync.

Click the link below to accept the invitation and start collaborating:
${inviteUrl}

If you have any questions, please contact the person who invited you.

Best regards,
The WorkSync Team`;

    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #015958;">You've been invited to join ${workspaceName}</h2>
        <p>Hi there!</p>
        <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>"${workspaceName}"</strong> on WorkSync.</p>
        <p>Click the button below to accept the invitation and start collaborating:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #0FC2C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0CABA8;">${inviteUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">If you have any questions, please contact the person who invited you.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The WorkSync Team</p>
      </div>
    `;
  } else {
    text = `Hi there!

${inviterName} has invited you to join the workspace "${workspaceName}" on WorkSync.

It looks like you don't have a WorkSync account yet. Click the link below to sign up and join the workspace:
${inviteUrl}

WorkSync is a collaborative workspace platform that helps teams manage projects, tasks, and communication all in one place.

If you have any questions, please contact the person who invited you.

Best regards,
The WorkSync Team`;

    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #015958;">You've been invited to join ${workspaceName}</h2>
        <p>Hi there!</p>
        <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>"${workspaceName}"</strong> on WorkSync.</p>
        <p>It looks like you don't have a WorkSync account yet. Click the button below to sign up and join the workspace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #0FC2C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign Up & Join</a>
        </div>
        <p>WorkSync is a collaborative workspace platform that helps teams manage projects, tasks, and communication all in one place.</p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0CABA8;">${inviteUrl}</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">If you have any questions, please contact the person who invited you.</p>
        <p style="color: #666; font-size: 14px;">Best regards,<br>The WorkSync Team</p>
      </div>
    `;
  }

  return sendEmail({ to, subject, text, html });
}