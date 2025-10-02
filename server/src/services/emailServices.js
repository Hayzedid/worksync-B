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

  if (emailConfig.auth.pass === 'dummy-password' || 
      emailConfig.auth.pass === 'your-password-here' || 
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

export async function sendWelcomeEmail(email, subscriberData = {}) {
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
                    <li>� Expert insights on team collaboration</li>
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

  return sendEmail({ to: email, subject, text, html });
}

export async function sendReminderEmail(email, reminderData, type = 'task') {
  const { title, description, dueDate, priority, workspaceName, startDate, category } = reminderData;

  let subject, html, text;

  if (type === 'event') {
    subject = `Event Reminder: ${title}`;

    html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Reminder</title>
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
        .event-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .event-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .event-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 14px;
        }
        .category {
            background: #e6fffa;
            color: #065f46;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
        }
        .start-date {
            color: #718096;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Event Reminder 📅</h1>
            <p>Don't miss your upcoming event</p>
        </div>
        <div class="content">
            <h2>Event Reminder</h2>
            <p>You have an upcoming event that requires your attention. Here's the details:</p>

            <div class="event-card">
                <div class="event-title">${title}</div>
                <div class="event-meta">
                    <span class="category">${category || 'General'}</span>
                    <span class="start-date">Starts: ${new Date(startDate).toLocaleDateString()}</span>
                </div>
                ${description ? `<p style="margin: 0; color: #4a5568;">${description}</p>` : ''}
            </div>

            <p>Make sure to attend this event on time. If you need any help or have questions, don't hesitate to reach out to your team.</p>

            <div style="text-align: center;">
                <a href="https://worksync.ng" class="button">View in WorkSync</a>
            </div>

            <p>Stay productive!</p>
            <p><strong>The WorkSync Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>WorkSync</strong> - All-in-One Productivity Platform</p>
            <p>Lagos, Nigeria | <a href="mailto:support@worksync.ng">support@worksync.ng</a></p>
        </div>
    </div>
</body>
</html>`;

    text = `
Event Reminder: ${title}

You have an upcoming event that requires your attention.

Event Details:
- Title: ${title}
- Category: ${category || 'General'}
- Start Date: ${new Date(startDate).toLocaleDateString()}
${description ? `- Description: ${description}` : ''}

Make sure to attend this event on time. If you need any help or have questions, don't hesitate to reach out to your team.

View in WorkSync: https://worksync.ng

Stay productive!

The WorkSync Team

---
WorkSync - All-in-One Productivity Platform
Lagos, Nigeria | support@worksync.ng
`;
  } else {
    // Task reminder (default)
    subject = `Task Reminder: ${title}`;

    html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Reminder</title>
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
        .task-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .task-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .task-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 14px;
        }
        .priority {
            background: #fed7d7;
            color: #c53030;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
        }
        .priority.high { background: #fed7d7; color: #c53030; }
        .priority.medium { background: #fef5e7; color: #d69e2e; }
        .priority.low { background: #c6f6d5; color: #38a169; }
        .due-date {
            color: #718096;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Task Reminder ⏰</h1>
            <p>Don't forget about your upcoming task</p>
        </div>
        <div class="content">
            <h2>Task Reminder</h2>
            <p>You have an upcoming task that requires your attention. Here's the details:</p>

            <div class="task-card">
                <div class="task-title">${title}</div>
                <div class="task-meta">
                    <span class="priority ${priority?.toLowerCase() || 'medium'}">${priority || 'Medium'}</span>
                    <span class="due-date">Due: ${new Date(dueDate).toLocaleDateString()}</span>
                </div>
                ${description ? `<p style="margin: 0; color: #4a5568;">${description}</p>` : ''}
            </div>

            <p>Make sure to complete this task on time to keep your project on track. If you need any help or have questions, don't hesitate to reach out to your team.</p>

            <div style="text-align: center;">
                <a href="https://worksync.ng" class="button">View in WorkSync</a>
            </div>

            <p>Stay productive!</p>
            <p><strong>The WorkSync Team</strong></p>
        </div>
        <div class="footer">
            <p><strong>WorkSync</strong> - All-in-One Productivity Platform</p>
            <p>Lagos, Nigeria | <a href="mailto:support@worksync.ng">support@worksync.ng</a></p>
        </div>
    </div>
</body>
</html>`;

    text = `
Task Reminder: ${title}

You have an upcoming task that requires your attention.

Task Details:
- Title: ${title}
- Priority: ${priority || 'Medium'}
- Due Date: ${new Date(dueDate).toLocaleDateString()}
${description ? `- Description: ${description}` : ''}

Make sure to complete this task on time to keep your project on track. If you need any help or have questions, don't hesitate to reach out to your team.

View in WorkSync: https://worksync.ng

Stay productive!

The WorkSync Team

---
WorkSync - All-in-One Productivity Platform
Lagos, Nigeria | support@worksync.ng
`;
  }

  return sendEmail({ to: email, subject, text, html });
}

export async function sendTaskReminder(email, taskData) {
  return sendReminderEmail(email, taskData);
}