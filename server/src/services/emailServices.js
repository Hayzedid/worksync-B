export async function sendEmail({ to, subject }) {
  // Dummy implementation for development
  console.log(`[EmailService] Would send email to: ${to}, subject: ${subject}`);
  // In production, integrate with nodemailer, SendGrid, etc.
  return true;
} 